package com.kargopilot.app;

import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

final class TrackingEngine {
    static final int JOB_ID=76121;
    static final String CHANNEL="shipment_updates";
    static final ExecutorService EXECUTOR=Executors.newSingleThreadExecutor();
    static final Set<String> BUSY=Collections.synchronizedSet(new HashSet<>());
    private final Context context;
    TrackingEngine(Context context){this.context=context.getApplicationContext();}
    private android.content.SharedPreferences prefs(){return context.getSharedPreferences("tracking",0);}
    JSONObject state(){try{return new JSONObject(context.getSharedPreferences("kargopilot",0).getString("data","{}"));}catch(Exception ex){return new JSONObject();}}
    JSONObject shipment(String id){JSONArray shipments=state().optJSONArray("shipments");if(shipments!=null)for(int i=0;i<shipments.length();i++){JSONObject s=shipments.optJSONObject(i);if(s!=null&&id.equals(s.optString("id")))return s;}return null;}
    private JSONObject cached(String id){try{return new JSONObject(prefs().getString("record-"+id,"{}"));}catch(Exception e){return new JSONObject();}}
    JSONObject snapshots(){
        JSONObject result=new JSONObject();JSONArray shipments=state().optJSONArray("shipments");
        if(shipments!=null)for(int i=0;i<shipments.length();i++)try{JSONObject s=shipments.getJSONObject(i),cache=cached(s.getString("id"));if(TrackingData.identity(s).equals(cache.optString("identity")))result.put(s.getString("id"),cache);}catch(Exception ignored){}
        return result;
    }
    void prune(){Set<String> keys=new HashSet<>();JSONArray items=state().optJSONArray("shipments");if(items!=null)for(int i=0;i<items.length();i++){JSONObject s=items.optJSONObject(i);if(s!=null)keys.add("record-"+s.optString("id"));}android.content.SharedPreferences.Editor edit=prefs().edit();for(String key:prefs().getAll().keySet())if(key.startsWith("record-")&&!keys.contains(key))edit.remove(key);edit.apply();}
    boolean permission(){
        if(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=24&&!manager.areNotificationsEnabled())return false;
        if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=manager.getNotificationChannel(CHANNEL);if(channel!=null&&channel.getImportance()==NotificationManager.IMPORTANCE_NONE)return false;}
        return true;
    }
    JSONObject connection(){
        JSONObject out=new JSONObject();try{out.put("configured",!SecureTrackingKey.read(context).isEmpty()).put("notificationsEnabled",prefs().getBoolean("notifications",false)).put("permissionGranted",permission());boolean scheduled=false;for(JobInfo job:context.getSystemService(JobScheduler.class).getAllPendingJobs())if(job.getId()==JOB_ID)scheduled=true;out.put("backgroundScheduled",scheduled);}catch(Exception ignored){}return out;
    }
    void schedule(){
        JobScheduler jobs=context.getSystemService(JobScheduler.class);
        if(SecureTrackingKey.read(context).isEmpty()||!prefs().getBoolean("notifications",false)||!permission()){jobs.cancel(JOB_ID);return;}
        JobInfo.Builder job=new JobInfo.Builder(JOB_ID,new ComponentName(context,TrackingJobService.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true);
        if(Build.VERSION.SDK_INT>=24)job.setPeriodic(6*60*60*1000L,60*60*1000L);else job.setPeriodic(6*60*60*1000L);
        if(Build.VERSION.SDK_INT>=26)job.setRequiresBatteryNotLow(true);
        jobs.schedule(job.build());
    }
    void setNotifications(boolean enabled){prefs().edit().putBoolean("notifications",enabled).commit();schedule();}
    void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"Kargo hareketleri",NotificationManager.IMPORTANCE_DEFAULT);channel.setDescription("Takip servisinde yeni kargo hareketi veya durum değişikliği");context.getSystemService(NotificationManager.class).createNotificationChannel(channel);}}
    private int carrierCode(String carrier) throws Exception {
        try(InputStream in=context.getAssets().open("carrier-mapping.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);JSONObject codes=new JSONObject(out.toString("UTF-8"));if(!codes.has(carrier)&&!carrier.startsWith("custom-"))throw new TrackingApi.Failure(-2,"Bu firma için API desteği doğrulanmadı. Resmî takip bağlantısını kullanabilirsin.");return codes.optInt(carrier);}
    }
    void refresh(String id,boolean background){
        JSONObject s=shipment(id);if(s==null)return;
        String identity=TrackingData.identity(s);JSONObject previous=cached(id);
        if(!identity.equals(previous.optString("identity")))previous=new JSONObject();
        long now=System.currentTimeMillis();
        // Repeated taps read the cache; no duplicate subscription or quota churn.
        if(now-previous.optLong("attemptAt")<60000)return;
        JSONObject next;
        try {
            String key=SecureTrackingKey.read(context);if(key.isEmpty())throw new TrackingApi.Failure(-3,"Canlı takip için Ayarlar’dan 17TRACK API anahtarını bağla.");
            next=TrackingApi.get(s,carrierCode(s.optString("carrier")),key);
        }catch(Exception error){
            try{next=new JSONObject(previous.toString());next.put("error",error instanceof TrackingApi.Failure?error.getMessage():error instanceof java.net.SocketTimeoutException?"Takip servisi zaman aşımına uğradı. Son kayıt korunuyor.":"Ağ bağlantısı kurulamadı veya takip yanıtı okunamadı. Son kayıt korunuyor.");}
            catch(Exception ignored){return;}
        }
        try{
            next.put("identity",identity).put("attemptAt",now);
            JSONObject current=shipment(id);if(current==null||!identity.equals(TrackingData.identity(current)))return;
            if(!prefs().edit().putString("record-"+id,next.toString()).commit())return;
            if(prefs().getBoolean("notifications",false)&&permission()&&!current.optBoolean("archived")&&TrackingData.changed(previous,next))notifyShipment(current,next);
        }catch(Exception ignored){}
    }
    private void notifyShipment(JSONObject shipment,JSONObject result){
        createChannel();String id=shipment.optString("id");
        Intent intent=new Intent(context,MainActivity.class).putExtra("shipmentId",id).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent target=PendingIntent.getActivity(context,id.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String title=shipment.optString("name","KargoPilot");String text=TrackingData.statusLabel(result.optString("status"));
        JSONArray events=result.optJSONArray("events");if(events!=null&&events.length()>0)text+=" · "+events.optJSONObject(0).optString("description");
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL):new Notification.Builder(context);
        builder.setSmallIcon(com.kargopilot.app.R.drawable.ic_notification).setContentTitle(title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(target).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setCategory(Notification.CATEGORY_STATUS);
        context.getSystemService(NotificationManager.class).notify(id.hashCode(),builder.build());
    }
    void testNotification(){if(!permission())return;try{notifyShipment(new JSONObject().put("id","notification-test").put("name","KargoPilot bildirim testi"),new JSONObject().put("status","NotFound").put("events",new JSONArray().put(new JSONObject().put("description","Bu bir test bildirimidir; gerçek kargo hareketi değildir."))));}catch(Exception ignored){}}
}
