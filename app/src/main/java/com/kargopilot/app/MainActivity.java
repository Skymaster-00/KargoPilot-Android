package com.kargopilot.app;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.graphics.Color;
import android.view.View;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.json.JSONArray;

public class MainActivity extends Activity {
    private WebView web;
    private String pendingBackup;
    private TrackingEngine tracking;
    private String pendingShipmentId;
    private static final String ORIGIN = "https://kargopilot.local/";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        tracking = new TrackingEngine(this);
        tracking.createChannel();
        tracking.schedule();
        pendingShipmentId=getIntent().getStringExtra("shipmentId");
        web = new WebView(this);
        web.setBackgroundColor(0xFFF6F7F3);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString()+" KargoPilot/"+com.kargopilot.app.BuildConfig.VERSION_NAME+" (https://github.com/Skymaster-00/KargoPilot-Android)");
        web.addJavascriptInterface(new Bridge(), "Native");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("kargopilot.local".equals(u.getHost()) && "https".equals(u.getScheme())) {
                    String path = u.getPath();
                    if (path == null || path.equals("/")) path = "/index.html";
                    if (path.contains("..")) return blocked();
                    String mime = path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".json") ? "application/json" : path.endsWith(".png") ? "image/png" : path.endsWith(".woff2") ? "font/woff2" : path.endsWith(".ttf") ? "font/ttf" : "text/html";
                    try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1))); }
                    catch (IOException ex) { return blocked(); }
                }
                // The only remote WebView content is user-requested OSM raster tiles.
                if("https".equals(u.getScheme())&&"tile.openstreetmap.org".equals(u.getHost())&&u.getPath()!=null&&u.getPath().matches("/[0-9]{1,2}/[0-9]+/[0-9]+\\.png"))return null;
                return blocked();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame()) openExternal(request.getUrl().toString());
                return true;
            }
            @Override public void onPageFinished(WebView view,String url){pushTracking();openPendingShipment();}
        });
        setContentView(web);
        web.loadUrl(ORIGIN + "index.html");
    }

    private void pushTracking(){if(web!=null)web.evaluateJavascript("window.receiveTracking && window.receiveTracking("+tracking.snapshots()+","+tracking.connection()+")",null);}
    private void openPendingShipment(){if(pendingShipmentId!=null){web.evaluateJavascript("window.openNotificationShipment && window.openNotificationShipment("+JSONObject.quote(pendingShipmentId)+")",null);pendingShipmentId=null;}}
    @Override protected void onResume(){super.onResume();if(web!=null){pushTracking();tracking.schedule();}}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);pendingShipmentId=intent.getStringExtra("shipmentId");openPendingShipment();}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);tracking.schedule();pushTracking();}

    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void tell(String msg) { runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()); }

    private void openExternal(String url) {
        runOnUiThread(() -> {
            try {
                Uri uri = Uri.parse(url);
                if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) { tell("Geçerli bir HTTPS adresi gerekli."); return; }
                startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
            } catch (ActivityNotFoundException ex) { tell("Takip sayfası için bir tarayıcı yükleyin."); }
            catch (Exception ex) { tell("Bağlantı açılamadı."); }
        });
    }

    private class Bridge {
        @JavascriptInterface public String read() { return getSharedPreferences("kargopilot", MODE_PRIVATE).getString("data", ""); }
        @JavascriptInterface public boolean save(String json) {
            if (json.length() > 2000000) return false;
            try { new JSONObject(json); boolean ok=getSharedPreferences("kargopilot", MODE_PRIVATE).edit().putString("data", json).commit();if(ok)tracking.prune();return ok; }
            catch (Exception ex) { return false; }
        }
        @JavascriptInterface public void open(String url) { openExternal(url); }
        @JavascriptInterface public String trackingSnapshot(){return tracking.snapshots().toString();}
        @JavascriptInterface public String trackingConnection(){return tracking.connection().toString();}
        @JavascriptInterface public boolean systemDark(){return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;}
        @JavascriptInterface public boolean setTrackingKey(String key){boolean ok=SecureTrackingKey.save(MainActivity.this,key.trim());tracking.schedule();return ok;}
        @JavascriptInterface public boolean refreshTracking(String id){
            if(tracking.shipment(id)==null||!TrackingEngine.BUSY.add(id))return false;
            TrackingEngine.EXECUTOR.execute(()->{try{tracking.refresh(id,false);}finally{TrackingEngine.BUSY.remove(id);runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())web.evaluateJavascript("window.finishTracking && window.finishTracking("+JSONObject.quote(id)+","+tracking.snapshots()+","+tracking.connection()+")",null);});}});
            return true;
        }
        @JavascriptInterface public void setNotifications(boolean enabled){
            tracking.setNotifications(enabled);
            runOnUiThread(()->{if(enabled&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},17);else pushTracking();});
        }
        @JavascriptInterface public void testNotification(){runOnUiThread(()->{if(tracking.permission())tracking.testNotification();else tell("Önce bildirim iznini aç.");});}
        @JavascriptInterface public void notificationSettings(){runOnUiThread(()->{Intent intent=new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName()));startActivity(intent);});}
        @JavascriptInterface public void theme(boolean dark){runOnUiThread(()->{web.setBackgroundColor(dark?0xFF101A17:0xFFF6F7F3);getWindow().setStatusBarColor(dark?0xFF101A17:0xFFF6F7F3);getWindow().setNavigationBarColor(dark?0xFF16231E:Build.VERSION.SDK_INT>=27?Color.WHITE:0xFF124E40);int flags=dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;if(!dark&&Build.VERSION.SDK_INT>=27)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;getWindow().getDecorView().setSystemUiVisibility(flags);});}
        @JavascriptInterface public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager cb = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cb.setPrimaryClip(ClipData.newPlainText("Kargo takip numarası", text));
            });
        }
        @JavascriptInterface public void share(String text) {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
                try { startActivity(Intent.createChooser(intent, "Gönderiyi paylaş")); }
                catch (ActivityNotFoundException ex) { tell("Paylaşım uygulaması bulunamadı."); }
            });
        }
        @JavascriptInterface public void exportBackup(String json) {
            if (json.length() > 2000000) return;
            pendingBackup = json;
            runOnUiThread(() -> {
                try { startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, "KargoPilot-yedek.json"), 10); }
                catch (ActivityNotFoundException ex) { tell("Dosya seçici bulunamadı."); }
            });
        }
        @JavascriptInterface public void importBackup() {
            runOnUiThread(() -> {
                try { startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"), 11); }
                catch (ActivityNotFoundException ex) { tell("Dosya seçici bulunamadı."); }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        try {
            if (request == 10 && pendingBackup != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) { out.write(pendingBackup.getBytes(StandardCharsets.UTF_8)); }
                pendingBackup = null;
                tell("Yedek dosyası kaydedildi.");
            } else if (request == 11) {
                try (InputStream in = getContentResolver().openInputStream(data.getData()); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int count;
                    while ((count = in.read(buffer)) != -1) { out.write(buffer, 0, count); if (out.size() > 2000000) throw new IOException("Large file"); }
                    String json = out.toString("UTF-8");
                    web.evaluateJavascript("window.receiveBackup(" + JSONObject.quote(json) + ")", null);
                }
            }
        } catch (Exception ex) { tell("Dosya okunamadı veya kaydedilemedi."); }
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.handleBack()", value -> { if (!"true".equals(value)) super.onBackPressed(); });
    }
    @Override protected void onDestroy() { web.removeJavascriptInterface("Native"); web.destroy(); super.onDestroy(); }
}
