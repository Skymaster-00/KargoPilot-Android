package com.kargopilot.app;

import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;

public class TrackingDataTest {
    private JSONObject event(String time,String description,Object lat,Object lon) throws Exception {
        return new JSONObject().put("time_utc",time).put("description",description).put("location","İstanbul").put("address",new JSONObject().put("coordinates",new JSONObject().put("latitude",lat).put("longitude",lon)));
    }
    private JSONObject accepted(String status,JSONArray events,JSONObject latest) throws Exception {
        return new JSONObject().put("carrier",101271).put("track_info",new JSONObject().put("latest_status",new JSONObject().put("status",status)).put("latest_event",latest==null?JSONObject.NULL:latest).put("tracking",new JSONObject().put("providers",new JSONArray().put(new JSONObject().put("provider",new JSONObject().put("name","Fixture carrier")).put("events",events)))));
    }
    @Test public void mergesLatestWithHistorySortsAndDeduplicates() throws Exception {
        JSONObject a=event("2026-11-21T09:00:00Z","Yola çıktı",41.0,29.0),b=event("2026-11-21T10:00:00Z","Dağıtıma çıktı",41.1,29.1);
        JSONObject result=TrackingData.normalize(accepted("OutForDelivery",new JSONArray().put(a).put(b),b),1234);
        assertEquals("OutForDelivery",result.getString("status"));assertEquals(2,result.getJSONArray("events").length());
        assertEquals("Dağıtıma çıktı",result.getJSONArray("events").getJSONObject(0).getString("description"));assertEquals(1234,result.getLong("syncedAt"));
    }
    @Test public void missingOrInvalidCoordinatesAreNeverFabricated() throws Exception {
        JSONObject missing=event("2026-11-21T09:00:00Z","Yolda",JSONObject.NULL,JSONObject.NULL);
        JSONObject invalid=event("2026-11-21T10:00:00Z","Yolda",140.0,400.0);
        JSONObject result=TrackingData.normalize(accepted("InTransit",new JSONArray().put(missing).put(invalid),null),1234);
        for(int i=0;i<2;i++){assertFalse(result.getJSONArray("events").getJSONObject(i).has("lat"));assertFalse(result.getJSONArray("events").getJSONObject(i).has("lon"));}
    }
    @Test public void unchangedRefreshDoesNotNotifyAndFailuresDoNotNotify() throws Exception {
        JSONObject a=TrackingData.normalize(accepted("InTransit",new JSONArray().put(event("2026-11-21T09:00:00Z","Yolda",41.0,29.0)),null),1000);
        JSONObject b=new JSONObject(a.toString()).put("syncedAt",2000);
        assertFalse(TrackingData.changed(a,b));assertTrue(TrackingData.changed(null,b));
        b.put("error","Bağlantı yok");assertFalse(TrackingData.changed(a,b));
        b.remove("error");b.put("status","Delivered");assertTrue(TrackingData.changed(a,b));
        b.put("status","NotFound");assertFalse(TrackingData.changed(a,b));
    }
    @Test public void newMovementNotifiesEvenIfOverallStatusUnchanged() throws Exception {
        JSONObject a=TrackingData.normalize(accepted("InTransit",new JSONArray().put(event("2026-11-21T09:00:00Z","Yolda",41.0,29.0)),null),1000);
        JSONObject b=TrackingData.normalize(accepted("InTransit",new JSONArray().put(event("2026-11-21T10:00:00Z","Aktarma merkezinde",41.1,29.1)),null),2000);
        assertTrue(TrackingData.changed(a,b));
    }
    @Test public void noEventsIsNotFoundAndIsoOffsetsSortCorrectly() throws Exception {
        JSONObject result=TrackingData.normalize(accepted("NotFound",new JSONArray(),null),1000);assertEquals(0,result.getJSONArray("events").length());
        assertEquals(TrackingData.timeMillis("2026-11-21T09:00:00Z"),TrackingData.timeMillis("2026-11-21T12:00:00+03:00"));
        assertEquals(0,TrackingData.timeMillis("not-a-time"));
    }
    @Test public void changingNumberOrAdditionalFieldsInvalidatesPreviousData() throws Exception {
        JSONObject a=new JSONObject().put("carrier","kolay").put("number","TEST0001");
        JSONObject b=new JSONObject(a.toString()).put("number","TEST0002");assertNotEquals(TrackingData.identity(a),TrackingData.identity(b));
        b=new JSONObject(a.toString()).put("postalCode","34000");assertNotEquals(TrackingData.identity(a),TrackingData.identity(b));
    }
}
