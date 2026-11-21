package com.kargopilot.app;

import android.app.job.*;
import org.json.*;
import java.util.*;

public class TrackingJobService extends JobService {
    private volatile boolean stopped;
    @Override public boolean onStartJob(JobParameters params){
        stopped=false;
        TrackingEngine.EXECUTOR.execute(()->{
            TrackingEngine engine=new TrackingEngine(this);
            try{
                JSONArray records=engine.state().optJSONArray("shipments");List<String> active=new ArrayList<>();JSONObject snapshots=engine.snapshots();
                if(records!=null)for(int i=0;i<records.length();i++){JSONObject s=records.getJSONObject(i);JSONObject cache=snapshots.optJSONObject(s.optString("id"));if(!s.optBoolean("archived")&&!s.optString("status").equals("delivered")&&(cache==null||!cache.optString("status").equals("Delivered")))active.add(s.getString("id"));}
                int start=getSharedPreferences("tracking",0).getInt("cursor",0);int processed=0;
                for(int i=0;i<Math.min(active.size(),10)&&!stopped;i++){String id=active.get((start+i)%active.size());if(TrackingEngine.BUSY.add(id))try{engine.refresh(id,true);}finally{TrackingEngine.BUSY.remove(id);}processed++;}
                getSharedPreferences("tracking",0).edit().putInt("cursor",active.isEmpty()?0:(start+processed)%active.size()).apply();
            }catch(Exception ignored){}
            if(!stopped)jobFinished(params,false);
        });
        return true;
    }
    @Override public boolean onStopJob(JobParameters params){stopped=true;return true;}
}
