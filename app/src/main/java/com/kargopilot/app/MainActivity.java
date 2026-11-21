package com.kargopilot.app;

import android.app.Activity;
import android.os.Bundle;
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
    private static final String ORIGIN = "https://kargopilot.local/";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(0xFFF6F7F3);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new Bridge(), "Native");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("kargopilot.local".equals(u.getHost()) && "https".equals(u.getScheme())) {
                    String path = u.getPath();
                    if (path == null || path.equals("/")) path = "/index.html";
                    if (path.contains("..")) return blocked();
                    String mime = path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".json") ? "application/json" : path.endsWith(".woff2") ? "font/woff2" : path.endsWith(".ttf") ? "font/ttf" : "text/html";
                    try { return new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1))); }
                    catch (IOException ex) { return blocked(); }
                }
                return blocked();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame()) openExternal(request.getUrl().toString());
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(ORIGIN + "index.html");
    }

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
            try { new JSONObject(json); return getSharedPreferences("kargopilot", MODE_PRIVATE).edit().putString("data", json).commit(); }
            catch (Exception ex) { return false; }
        }
        @JavascriptInterface public void open(String url) { openExternal(url); }
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
