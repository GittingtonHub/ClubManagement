import { useEffect, useState } from 'react';
import { DayPilot, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import "../assets/toolbar.css";

const ReactScheduler = () => {
  const [scheduler, setScheduler] = useState(null);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

  const [startDate, setStartDate] = useState(DayPilot.Date.today().toDate());
  const [days, setDays] = useState(DayPilot.Date.today().daysInMonth());
  const [theme, setTheme] = useState("dark");

  const themes = [
    { name: "light", text: "Light" },
    { name: "dark", text: "Dark" }
  ];

  const colors = [
    { name: "(default)", id: null },
    { name: "Blue",    id: "#6fa8dc" },
    { name: "Green",   id: "#93c47d" },
    { name: "Yellow",  id: "#ffd966" },
    { name: "Red",     id: "#f6b26b" }
  ];

  const eventEditForm =  [
    { name: "Text", id: "text" },
    { name: "Start", id: "start", type: "datetime", disabled: true },
    { name: "End", id: "end", type: "datetime", disabled: true },
    { name: "Resource", id: "resource", type: "select", options: resources },
    { name: "Color", id: "backColor", type: "select", options: colors }
  ];

  const editEvent = async (e) => {
    const modal = await DayPilot.Modal.form(eventEditForm, e.data);
    if (modal.canceled) {
      return;
    }

    scheduler.events.update(modal.result);
  };

const onTimeRangeSelected = async (args) => {
    const modal = await DayPilot.Modal.form(eventEditForm, {
      start: args.start,
      end: args.end,
      resource: args.resource, 
      text: "New Event"
    });

    if (modal.canceled) return;

    // This tells the frontend to stop highlighting the cells
    scheduler.clearSelection();

    console.log("DayPilot clicked ID:", args.resource);
    console.log("Current Resources State:", resources);

    const selectedResource = resources.find(r => String(r.id) === String(args.resource));
  
    // DEBUG: If this logs 'undefined', the mapping in loadData is the problem
    console.log("Found Resource:", selectedResource);


    // 2. STRIKE SYSTEM: If we don't have the type, do NOT proceed.
    if (!selectedResource || !selectedResource.type) {
      console.error("Resource Type Missing for ID:", args.resource);
      alert("Error: Resource data not loaded properly. Cannot save.");
      return; 
    }

    const payload = {
      // 1. Fallback to 1 if localStorage is empty to avoid sending 'null'
      user_id: localStorage.getItem('userId') || 1, 
      
      // 2. Use args.resource (we know this has the ID: 2 or 3)
      resource_id: args.resource, 
      
      // 3. Use the selectedResource we already found on line 18
      service_type: selectedResource.type, 
      
      // 4. Times usually come from the modal if the user edited them
      start_time: modal.result.start.toString(),
      end_time: modal.result.end.toString()
    };

    const response = await fetch('/api/reservations.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
        scheduler.events.add(modal.result);
    } else {
        // 1. Get the JSON error from the response
        const errorData = await response.json(); 
        
        // 2. Show the specific message (e.g., "User already has a reservation...")
        console.error("Database save failed:", errorData.message);
        alert(errorData.message || "Could not save reservation.");
    }
  };
  const onBeforeEventRender = (args) => {
    args.data.borderColor = "darker";
    args.data.areas = [
      {
        right: 5,
        top: "calc(50% - 15px)",
        width: 30,
        height: 30,
        symbol: "/icons/daypilot.svg#edit",
        borderRadius: "50%",
        backColor: "#ffffff99",
        fontColor: "#999999",
        padding: 5,
        onClick: async (args) => {
          await editEvent(args.source);
        }
      }
    ];
  };

useEffect(() => {
    if (!scheduler) return;

    const loadData = async () => {
      try {
        // load events from the server
        const eventsResponse = await fetch('/api/reservations.php', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const eventsData = await eventsResponse.json();
        
        // Mapping your DB fields to DayPilot fields
        const formattedEvents = eventsData.map(e => ({
          id: e.reservation_id,
          text: e.service_type.replace('_', ' '), 
          start: e.start_time,
          end: e.end_time,
          // CHANGE THIS: It must match the ID from your inventory table (e.g., 1, 2, or 3)
          resource: e.resource_id, 
          status: e.status
        }));
        setEvents(formattedEvents);

        //load resources from the server
        const resourcesResponse = await fetch('/api/inventory.php');
        const resourcesData = await resourcesResponse.json();
        
        const formattedResources = resourcesData.map(r => ({
          name: r.name,
          id: r.id,
          type: r.type
        }));
        setResources(formattedResources);

        //scroll to current day?
        scheduler.scrollTo(DayPilot.Date.today());

      } catch (error) {
        console.error("Failed to load scheduler data:", error);
      }
    };

    loadData();
  }, [scheduler]);

  return (
    <div>

      <DayPilotScheduler
        scale={"Hour"} //
        timeHeaders={[
          {groupBy: "Day"}, //
          {groupBy: "Hour", format: "H:mm"} // //
        ]}
        startDate={startDate}
        days={days}
        cellWidth={60}
        eventHeight={40}
        events={events}
        resources={resources}
        onBeforeEventRender={onBeforeEventRender}
        onTimeRangeSelected={onTimeRangeSelected}
        controlRef={setScheduler}
        theme={theme}
      />
    </div>
  );
}
export default ReactScheduler;
