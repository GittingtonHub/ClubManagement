import { useCallback, useEffect, useState } from 'react';
import { DayPilot, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import "../assets/toolbar.css";

const ReactScheduler = () => {
  const [scheduler, setScheduler] = useState(null);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);

  const [startDate, setStartDate] = useState(DayPilot.Date.today().toDate());
  const [days, setDays] = useState(DayPilot.Date.today().daysInMonth());
  const [theme, setTheme] = useState("dark");

  const themes = [
    { name: "light", text: "Light" },
    { name: "dark", text: "Dark" }
  ];

  const buildReservationForm = (resource) => {
    const base = [
      { name: "Resource", id: "resource", type: "select", options: resources, disabled: true },
      { name: "Description", id: "resource_description", type: "textarea", disabled: true },
      { name: "Start", id: "start", type: "datetime", disabled: true },
      { name: "End", id: "end", type: "datetime", disabled: true }
    ];

    if (!resource) {
      return base;
    }

    if (resource.name === "Bottle Service Silver" || resource.name === "Bottle Service Gold") {
      return [
        base[0],
        base[1],
        { name: "Section Number", id: "section_number", type: "select", options: sectionOptions },
        { name: "Guest Count", id: "guest_count", type: "number" },
        { name: "Minimum Spend", id: "minimum_spend", type: "number" },
        base[2],
        base[3]
      ];
    }

    if (resource.name === "Event Ticket GA" || resource.name === "Event Ticket VIP") {
      return [
        base[0],
        base[1],
        { name: "Event ID", id: "event_id", type: "select", options: eventOptions },
        { name: "Ticket Tier", id: "ticket_tier", type: "text", disabled: true },
        { name: "Quantity", id: "quantity", type: "number" },
        base[2],
        base[3]
      ];
    }

    return base;
  };

  const editEvent = async (e) => {
    const resource = resources.find(r => String(r.id) === String(e.data.resource));
    const modal = await DayPilot.Modal.form(buildReservationForm(resource), e.data);
    if (modal.canceled) {
      return;
    }

    scheduler.events.update(modal.result);
  };

const onTimeRangeSelected = async (args) => {
    const selectedResource = resources.find(r => String(r.id) === String(args.resource));
    const ticketTier = selectedResource?.name === "Event Ticket VIP" ? "VIP" : "GA";
    const minimumSpend = selectedResource?.name === "Bottle Service Gold" ? 1000 : 600;

    console.log("DayPilot clicked ID:", args.resource);
    console.log("Current Resources State:", resources);

    // DEBUG: If this logs 'undefined', the mapping in loadData is the problem
    console.log("Found Resource:", selectedResource);

    if (!selectedResource) {
      console.error("Resource Type Missing for ID:", args.resource);
      alert("Error: Resource data not loaded properly. Cannot save.");
      return; 
    }

    // Stop highlighting selected cells behind the dialog
    scheduler.clearSelection();

    const toApiDateTime = (value) => (value && typeof value.toString === "function" ? value.toString() : value);
    let modalData = {
      start: args.start,
      end: args.end,
      resource: args.resource,
      text: "New Event",
      resource_description: selectedResource.description || "",
      ticket_tier: ticketTier,
      minimum_spend: minimumSpend
    };

    while (true) {
      const modal = await DayPilot.Modal.form(buildReservationForm(selectedResource), modalData);
      if (modal.canceled) return;
      modalData = { ...modalData, ...modal.result };

      const payload = {
        user_id: localStorage.getItem('userId') || 1,
        resource_id: args.resource,
        service_type: selectedResource.name,
        start_time: toApiDateTime(modalData.start),
        end_time: toApiDateTime(modalData.end)
      };

      if (selectedResource.name === "Bottle Service Silver" || selectedResource.name === "Bottle Service Gold") {
        payload.section_number = modalData.section_number;
        payload.guest_count = modalData.guest_count;
        payload.minimum_spend = modalData.minimum_spend;
        if (!payload.section_number || !payload.guest_count || !payload.minimum_spend) {
          alert("Please fill out section number, guest count, and minimum spend.");
          continue;
        }
      }

      if (selectedResource.name === "Event Ticket GA" || selectedResource.name === "Event Ticket VIP") {
        payload.event_id = modalData.event_id;
        payload.ticket_tier = modalData.ticket_tier;
        payload.quantity = modalData.quantity;
        if (!payload.event_id || !payload.ticket_tier || !payload.quantity) {
          alert("Please fill out event ID and quantity.");
          continue;
        }
      }

      try {
        const response = await fetch('/api/reservations.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await loadData();
          window.dispatchEvent(new Event('reservations:changed'));
          return;
        }

        let message = "Could not save reservation.";
        try {
          const errorData = await response.json();
          message = errorData.message || message;
          console.error("Database save failed:", errorData.message);
        } catch {
          // keep fallback message if response is not JSON
        }
        alert(message);
      } catch (error) {
        console.error("Failed to save reservation:", error);
        alert("Could not save reservation.");
      }
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
        // symbol: "/icons/daypilot.svg#edit",
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

  const loadData = useCallback(async () => {
      try {
        // load events from the server
        const eventsResponse = await fetch('/api/reservations.php', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!eventsResponse.ok) {
          const errorText = await eventsResponse.text();
          throw new Error(`Failed to load reservations: ${eventsResponse.status} ${errorText}`);
        }

        const eventsJson = await eventsResponse.json();
        const eventsData = Array.isArray(eventsJson) ? eventsJson : [];
        
        // Mapping your DB fields to DayPilot fields
        const formattedEvents = eventsData.map(e => ({
          id: e.reservation_id,
          text: e.resource_name || e.service_type, 
          start: e.start_time,
          end: e.end_time,
          // CHANGE THIS: It must match the ID from your inventory table (e.g., 1, 2, or 3)
          resource: e.resource_id, 
          status: e.status
        }));
        setEvents(formattedEvents);

        //load resources from the server
        const resourcesResponse = await fetch('/api/inventory.php');
        const resourcesJson = await resourcesResponse.json();
        const resourcesData = Array.isArray(resourcesJson) ? resourcesJson : [];
        
        const formattedResources = resourcesData.map(r => ({
          name: r.name,
          id: r.id,
          type: r.type,
          description: r.description
        }));
        setResources(formattedResources);

        const sectionsResponse = await fetch('/api/sections.php');
        const sectionsJson = await sectionsResponse.json();
        const sectionsData = Array.isArray(sectionsJson) ? sectionsJson : [];
        setSectionOptions(sectionsData.map(s => ({
          name: String(s.section_number),
          id: s.section_number
        })));

        const ticketEventsResponse = await fetch('/api/events.php');
        const ticketEventsJson = await ticketEventsResponse.json();
        const eventsDataList = Array.isArray(ticketEventsJson) ? ticketEventsJson : [];
        setEventOptions(eventsDataList.map(e => ({
          name: String(e.event_id),
          id: e.event_id
        })));

        const resourceIdSet = new Set(formattedResources.map((r) => String(r.id)));
        const unmatchedEvents = formattedEvents.filter((e) => !resourceIdSet.has(String(e.resource)));
        if (unmatchedEvents.length > 0) {
          console.warn("Scheduler events without matching resource IDs:", unmatchedEvents);
        }

        //scroll to current day?
        scheduler?.scrollTo(DayPilot.Date.today());

      } catch (error) {
        console.error("Failed to load scheduler data:", error);
      }
  }, [scheduler]);

  useEffect(() => {
    if (!scheduler) return;
    loadData();
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('reservations:changed', handleRefresh);
    return () => window.removeEventListener('reservations:changed', handleRefresh);
  }, [scheduler, loadData]);

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
