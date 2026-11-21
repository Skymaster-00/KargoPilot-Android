package com.kargopilot.app;

import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.util.*;

public class TrackingApiTest {
    @Test public void newShipmentRegistersOnceAndPreservesRequiredAdditionalFields() throws Exception {
        List<String> calls=new ArrayList<>();
        JSONObject shipment=new JSONObject().put("number","TEST0001").put("postalCode","34000").put("phoneLast4","1234");
        TrackingApi.Transport transport=(endpoint,key,request)->{
            calls.add(endpoint);assertEquals("fixture-key",key);
            JSONObject row=request.getJSONObject(0);assertEquals("TEST0001",row.getString("number"));assertEquals(101271,row.getInt("carrier"));
            if(endpoint.equals("gettrackinfo"))return new JSONObject().put("rejected",new JSONArray().put(new JSONObject().put("error",new JSONObject().put("code",-18019902))));
            assertEquals("34000",row.getString("destination_postal_code"));assertEquals("1234",row.getString("phone_number_last_4"));
            return new JSONObject().put("accepted",new JSONArray().put(new JSONObject().put("number","TEST0001")));
        };
        JSONObject result=TrackingApi.get(shipment,101271,"fixture-key",transport);
        assertEquals(Arrays.asList("gettrackinfo","register"),calls);assertEquals("NotFound",result.getString("status"));assertTrue(result.getString("message").contains("birkaç dakika"));
    }
    @Test public void existingShipmentReadsStatusWithoutReregistering() throws Exception {
        List<String> calls=new ArrayList<>();
        JSONObject result=TrackingApi.get(new JSONObject().put("number","TEST0001"),0,"fixture-key",(endpoint,key,request)->{
            calls.add(endpoint);assertFalse(request.getJSONObject(0).has("carrier"));
            return new JSONObject().put("accepted",new JSONArray().put(new JSONObject().put("track_info",new JSONObject().put("latest_status",new JSONObject().put("status","Delivered")))));
        });
        assertEquals(Collections.singletonList("gettrackinfo"),calls);assertEquals("Delivered",result.getString("status"));
    }
    @Test public void rejectedRegistrationDoesNotFabricateAStatus() throws Exception {
        try{
            TrackingApi.get(new JSONObject().put("number","TEST0001"),101271,"fixture-key",(endpoint,key,request)->new JSONObject().put("rejected",new JSONArray().put(new JSONObject().put("error",new JSONObject().put("code",-18019903)))));
            fail("Rejected shipment must fail");
        }catch(TrackingApi.Failure expected){assertEquals(-18019903,expected.code);}
    }
}
