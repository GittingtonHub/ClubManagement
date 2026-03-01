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
    { name: "Blue", id: "#6fa8dc" },
    { name: "Green", id: "#93c47d" },
    { name: "Yellow", id: "#ffd966" },
    { name: "Red", id: "#f6b26b" }
  ];

  const eventEditForm = [
    { name: "Text", id: "text" },
    { name: "Start", id: "start", type: "datetime", disabled: true },
    { name: "End", id: "end", type: "datetime", disabled: true },
    { name: "Resource", id: "resource", type: "select", options: resources },
    { name: "Color", id: "backColor", type: "select", options: colors }
  ];

  const editEvent = async (e) => {
    const modal = await DayPilot.Modal.form(eventEditForm, e.data);
    if (modal.canceled) return;
    scheduler.events.update(modal.result);
  };

  const onTimeRangeSelected = async (args) => {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert("You must be logged in to make a reservation.");
      scheduler.clearSelection();
      return;
    }

    const modal = await DayPilot.Modal.form(eventEditForm, {
      start: args.start,
      end: args.end,
      resource: args.resource,
      text: "New Event"
    });

    if (modal.canceled) {
      scheduler.clearSelection();
      return;
    }

    scheduler.clearSelection();

    const selectedResource = resources.find(
      r => String(r.id) === String(args.resource)
    );

    if (!selectedResource || !selectedResource.type) {
      alert("Resource data not loaded properly.");
      return;
    }

    const payload = {
      user_id: userId,
      resource_id: args.resource,
      service_type: selectedResource.type,
      start_time: modal.result.start.toString(),
      end_time: modal.result.end.toString()
    };

    try {
      const response = await fetch('/api/reservations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        scheduler.events.add({
          id: DayPilot.guid(),
          text: selectedResource.name,
          start: payload.start_time,
          end: payload.end_time,
          resource: payload.resource_id
        });
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Could not save reservation.");
      }
    } catch (error) {
      console.error("Reservation save failed:", error);
      alert("Server error while saving reservation.");
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
        const eventsResponse = await fetch('/api/reservations.php');
        const eventsData = await eventsResponse.json();

        const formattedEvents = eventsData.map(e => ({
          id: e.reservation_id,
          text: e.service_type.replace('_', ' '),
          start: e.start_time,
          end: e.end_time,
          resource: e.resource_id,
          status: e.status
        }));

        setEvents(formattedEvents);

        const resourcesResponse = await fetch('/api/inventory.php');
        const resourcesData = await resourcesResponse.json();

        const formattedResources = resourcesData.map(r => ({
          name: r.name,
          id: r.id,
          type: r.type
        }));

        setResources(formattedResources);

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
        scale={"Hour"}
        timeHeaders={[
          { groupBy: "Day" },
          { groupBy: "Hour", format: "H:mm" }
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
};

export default ReactScheduler;