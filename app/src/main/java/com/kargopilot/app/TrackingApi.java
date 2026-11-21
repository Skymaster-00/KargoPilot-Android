package com.kargopilot.app;

import org.json.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Registered tracking: each standard shipment is subscribed once, then read. */
final class TrackingApi {
    interface Transport {JSONObject post(String endpoint,String key,JSONArray request) throws Exception;}
    private static long lastRequest;
    private static synchronized void throttle() throws InterruptedException {long delay=400-(System.currentTimeMillis()-lastRequest);if(delay>0)Thread.sleep(delay);lastRequest=System.currentTimeMillis();}
    static class Failure extends Exception {
        final int code;
        Failure(int code,String message){super(message);this.code=code;}
    }
    private static JSONObject post(String endpoint,String key,JSONArray request) throws Exception {
        throttle();
        HttpsURLConnection connection=(HttpsURLConnection)new URL("https://api.17track.net/track/v2.4/"+endpoint).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setRequestMethod("POST");connection.setConnectTimeout(15000);connection.setReadTimeout(35000);
        connection.setRequestProperty("Content-Type","application/json; charset=utf-8");connection.setRequestProperty("17token",key);connection.setDoOutput(true);
        try {
            try(OutputStream out=connection.getOutputStream()){out.write(request.toString().getBytes(StandardCharsets.UTF_8));}
            int code=connection.getResponseCode();
            if(code==401||code==403)throw new Failure(code,"API anahtarı veya hesap erişimi reddedildi.");
            if(code==429)throw new Failure(code,"Sorgu sınırına ulaşıldı. Daha sonra tekrar dene.");
            if(code!=200)throw new Failure(code,"Takip servisine şu anda ulaşılamıyor ("+code+").");
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            try(InputStream in=connection.getInputStream()){byte[] block=new byte[8192];int count;while((count=in.read(block))!=-1){bytes.write(block,0,count);if(bytes.size()>2000000)throw new Failure(-1,"Yanıt boyutu sınırı aşıldı.");}}
            JSONObject result=new JSONObject(bytes.toString("UTF-8"));
            if(result.optInt("code",-1)!=0)throw new Failure(result.optInt("code"),"API isteği reddedildi ("+result.optInt("code")+"). Hesap ve kotanı kontrol et.");
            return result.optJSONObject("data")==null?new JSONObject():result.getJSONObject("data");
        } finally {connection.disconnect();}
    }
    static JSONObject get(JSONObject shipment,int carrier,String key) throws Exception {
        return get(shipment,carrier,key,TrackingApi::post);
    }
    static JSONObject get(JSONObject shipment,int carrier,String key,Transport transport) throws Exception {
        JSONObject request=new JSONObject().put("number",shipment.getString("number"));
        if(carrier>0)request.put("carrier",carrier);
        JSONArray body=new JSONArray().put(request);
        JSONObject data=transport.post("gettrackinfo",key,body);
        JSONArray accepted=data.optJSONArray("accepted");
        if(accepted!=null&&accepted.length()>0)return TrackingData.normalize(accepted.getJSONObject(0),System.currentTimeMillis());
        JSONArray rejected=data.optJSONArray("rejected");
        JSONObject error=rejected!=null&&rejected.length()>0?rejected.getJSONObject(0).optJSONObject("error"):null;
        int code=error==null?0:error.optInt("code");
        if(code==-18019902) {
            JSONObject registration=new JSONObject(request.toString()).put("lang","tr");
            if(!shipment.optString("postalCode").isEmpty())registration.put("destination_postal_code",shipment.optString("postalCode"));
            if(!shipment.optString("phoneLast4").isEmpty())registration.put("phone_number_last_4",shipment.optString("phoneLast4"));
            JSONObject registered=transport.post("register",key,new JSONArray().put(registration));
            JSONArray registrations=registered.optJSONArray("accepted");
            if(registrations==null||registrations.length()==0)throw rejection(registered);
            JSONObject out=new JSONObject().put("source","17TRACK").put("status","NotFound").put("syncedAt",System.currentTimeMillis()).put("events",new JSONArray()).put("message","Takip kaydı oluşturuldu. İlk hareketler için birkaç dakika sonra yenile.");
            return out;
        }
        throw rejection(data);
    }
    private static Failure rejection(JSONObject data) {
        JSONArray rows=data.optJSONArray("rejected");JSONObject row=rows==null?null:rows.optJSONObject(0);JSONObject error=row==null?null:row.optJSONObject("error");int code=error==null?0:error.optInt("code");
        String text;
        switch(code){
            case -18019903: text="Firma otomatik belirlenemedi. Firma seçimini veya takip numaranı kontrol et.";break;
            case -18010012: text="Takip numarası servis tarafından geçersiz bulundu.";break;
            case -18019909: text="Bu gönderi için henüz hareket bilgisi yok.";break;
            default:text="Sorgu tamamlanamadı ("+code+"). Numara, firma, gerekli ek bilgiler ve API kotanı kontrol et.";
        }
        return new Failure(code,text);
    }
}
