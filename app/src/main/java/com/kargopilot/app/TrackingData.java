package com.kargopilot.app;

import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;

/** Pure normalization; no network, UI, credentials or fabricated coordinates. */
public final class TrackingData {
    private TrackingData() {}
    public static String identity(JSONObject shipment) {
        return shipment.optString("carrier") + "|" + shipment.optString("number") + "|" + shipment.optString("postalCode") + "|" + shipment.optString("phoneLast4");
    }
    public static JSONObject normalize(JSONObject accepted, long now) throws JSONException {
        JSONObject info = accepted.optJSONObject("track_info");
        if (info == null) throw new JSONException("Tracking information is not ready");
        JSONObject result = new JSONObject();
        result.put("source", "17TRACK");
        result.put("carrierCode", accepted.optInt("carrier"));
        result.put("status", info.optJSONObject("latest_status") == null ? "NotFound" : info.getJSONObject("latest_status").optString("status", "NotFound"));
        result.put("syncedAt", now);
        JSONArray providers = info.optJSONObject("tracking") == null ? null : info.getJSONObject("tracking").optJSONArray("providers");
        List<JSONObject> events = new ArrayList<>();
        String providerName = "";
        if (providers != null) for (int i=0;i<providers.length();i++) {
            JSONObject provider=providers.optJSONObject(i); if(provider==null) continue;
            JSONObject details=provider.optJSONObject("provider");
            if(details!=null && providerName.isEmpty()) providerName=details.optString("name", "");
            JSONArray items=provider.optJSONArray("events");
            if(items!=null) for(int j=0;j<items.length();j++) { JSONObject item=items.optJSONObject(j); if(item!=null) events.add(event(item)); }
        }
        JSONObject latest=info.optJSONObject("latest_event");
        if(latest!=null) events.add(event(latest));
        Collections.sort(events,(a,b)->Long.compare(timeMillis(b.optString("time")),timeMillis(a.optString("time"))));
        Set<String> seen=new HashSet<>(); JSONArray normalized=new JSONArray();
        for(JSONObject event:events) {String key=event.optString("time")+"|"+event.optString("description")+"|"+event.optString("location"); if(seen.add(key) && normalized.length()<120) normalized.put(event);}
        result.put("events", normalized);
        result.put("providerName", providerName);
        JSONObject eta=info.optJSONObject("time_metrics")==null?null:info.getJSONObject("time_metrics").optJSONObject("estimated_delivery_date");
        if(eta!=null) result.put("eta", new JSONObject().put("from",string(eta,"from")).put("to",string(eta,"to")).put("source",string(eta,"source")));
        return result;
    }
    private static JSONObject event(JSONObject raw) throws JSONException {
        JSONObject translated=raw.optJSONObject("description_translation");
        String description=translated==null?"":string(translated,"description");
        if(description.isEmpty()) description=string(raw,"description");
        JSONObject event=new JSONObject().put("time",string(raw,"time_utc")).put("description",description).put("location",string(raw,"location"));
        if(event.optString("time").isEmpty()) event.put("time",string(raw,"time_iso"));
        JSONObject address=raw.optJSONObject("address");
        if(address!=null) {
            if(event.optString("location").isEmpty()) {
                List<String> parts=new ArrayList<>(); for(String field:new String[]{"city","state","country"}) {String value=string(address,field);if(!value.isEmpty()&&!parts.contains(value))parts.add(value);}
                StringBuilder location=new StringBuilder();for(String part:parts){if(location.length()>0)location.append(", ");location.append(part);}event.put("location",location.toString());
            }
            JSONObject coords=address.optJSONObject("coordinates");
            if(coords!=null && !coords.isNull("latitude") && !coords.isNull("longitude")) {
                double lat=coords.optDouble("latitude",Double.NaN),lon=coords.optDouble("longitude",Double.NaN);
                if(!Double.isNaN(lat)&&!Double.isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180) event.put("lat",lat).put("lon",lon);
            }
        }
        return event;
    }
    private static String string(JSONObject object,String key) {return object.isNull(key)?"":object.optString(key,"");}
    static long timeMillis(String value){
        try{
            if(value.length()<19)return 0;
            String zone="GMT";
            java.util.regex.Matcher match=java.util.regex.Pattern.compile("([+-][0-9]{2}):?([0-9]{2})$").matcher(value);
            if(match.find())zone="GMT"+match.group(1)+":"+match.group(2);
            SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss",Locale.US);format.setLenient(false);format.setTimeZone(TimeZone.getTimeZone(zone));
            Date parsed=format.parse(value.substring(0,19));return parsed==null?0:parsed.getTime();
        }catch(Exception invalid){return 0;}
    }
    public static String fingerprint(JSONObject snapshot) {
        StringBuilder value=new StringBuilder(snapshot.optString("status"));
        JSONArray events=snapshot.optJSONArray("events");
        if(events!=null)for(int i=0;i<events.length();i++){JSONObject e=events.optJSONObject(i);if(e!=null)value.append('|').append(e.optString("time")).append('|').append(e.optString("description")).append('|').append(e.optString("location"));}
        return value.toString();
    }
    public static boolean changed(JSONObject previous,JSONObject next) {
        if(next==null || !next.optString("error").isEmpty() || next.optString("status").equals("NotFound"))return false;
        return previous==null || !fingerprint(previous).equals(fingerprint(next));
    }
    public static String statusLabel(String status) {
        switch(status) {
            case "InfoReceived": return "Gönderi bilgisi alındı";
            case "InTransit": return "Yolda";
            case "AvailableForPickup": return "Teslim noktasında";
            case "OutForDelivery": return "Dağıtıma çıktı";
            case "Delivered": return "Teslim edildi";
            case "DeliveryFailure": return "Teslimat yapılamadı";
            case "Exception": return "İşlem gerekiyor";
            case "Expired": return "Takip süresi doldu";
            default: return "Henüz hareket yok";
        }
    }
}
