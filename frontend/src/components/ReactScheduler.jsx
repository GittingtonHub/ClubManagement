import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayPilot, DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import "../assets/toolbar.css";
import { dispatchStaffAssignmentEmails } from '../lib/emailDispatch';

const ROLE_FALLBACKS = {
  "Bar Back": ["Bartender"],
  "Bottle Service Promoter": ["Bartender", "Bouncer"],
  "Security": ["Bouncer"]
};

// TEMP (Sprint testing): disable availability gating so all cells are reservable.
const ENABLE_AVAILABILITY_BLOCKING = false;

const ReactScheduler = () => {
  const [scheduler, setScheduler] = useState(null);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [schedulerResources, setSchedulerResources] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [availabilityRows, setAvailabilityRows] = useState([]);
  const [eventTimeWindowsById, setEventTimeWindowsById] = useState({});

  const [startDate] = useState(DayPilot.Date.today().toDate());
  const [days] = useState(DayPilot.Date.today().daysInMonth());
  const [theme] = useState("dark");

  const isTicketResource = (resource) =>
    resource?.name === "Event Ticket GA" || resource?.name === "Event Ticket VIP";

  const toTicketEventRowId = (resourceId, eventId) => `${resourceId}::event::${eventId}`;
  const ticketTierOptions = [
    { name: "GA", id: "GA" },
    { name: "VIP", id: "VIP" }
  ];

  const normalizeTicketTier = (value) => {
    const normalized = String(value ?? "").trim().toUpperCase();
    return normalized === "VIP" ? "VIP" : "GA";
  };

  const getTicketResourceByTier = (tier) => {
    const normalizedTier = normalizeTicketTier(tier);
    const ticketResourceName = normalizedTier === "VIP" ? "Event Ticket VIP" : "Event Ticket GA";
    return resources.find((resource) => resource?.name === ticketResourceName) || null;
  };

  const parseSchedulerResourceId = (value) => {
    // DayPilot may internally prefix IDs with "_" when normalizing numeric IDs.
    // Normalize that so scheduler row parsing remains stable.
    const parsed = String(value ?? "").trim().replace(/^_+/, "");
    const eventOnlyMatch = parsed.match(/^event::(\d+)$/);
    if (eventOnlyMatch) {
      return {
        resourceId: null,
        eventId: Number(eventOnlyMatch[1]),
        isEventOnlyRow: true
      };
    }

    const match = parsed.match(/^(\d+)::event::(\d+)$/);
    if (match) {
      return {
        resourceId: Number(match[1]),
        eventId: Number(match[2]),
        isEventOnlyRow: false
      };
    }

    return {
      resourceId: Number(parsed),
      eventId: null,
      isEventOnlyRow: false
    };
  };

  const getRequiredRolesForResource = (resourceName) => {
    const normalized = String(resourceName ?? "").toLowerCase();

    if (normalized.includes("open bar")) {
      return ["Bartender", "Bar Back"];
    }
    if (normalized.includes("bottle service")) {
      return ["Bottle Service Promoter"];
    }

    return [];
  };

  const toNativeDate = (value) => {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value.toDate === "function") {
      return value.toDate();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const toMinutesFromTimeString = (timeValue) => {
    const [hours, minutes] = String(timeValue ?? "").split(":");
    const parsedHours = Number.parseInt(hours, 10);
    const parsedMinutes = Number.parseInt(minutes, 10);
    if (!Number.isInteger(parsedHours) || !Number.isInteger(parsedMinutes)) {
      return null;
    }
    return (parsedHours * 60) + parsedMinutes;
  };

  const staffIdsByRole = useMemo(() => {
    const map = new Map();
    (Array.isArray(staffMembers) ? staffMembers : []).forEach((member) => {
      const role = String(member?.role ?? "").trim();
      const staffId = Number.parseInt(member?.id, 10);
      if (!role || !Number.isInteger(staffId)) {
        return;
      }

      const existing = map.get(role) ?? [];
      existing.push(staffId);
      map.set(role, existing);
    });
    return map;
  }, [staffMembers]);

  const availabilityByStaffId = useMemo(() => {
    const map = new Map();
    (Array.isArray(availabilityRows) ? availabilityRows : []).forEach((row) => {
      const staffId = Number.parseInt(row?.staff_id, 10);
      if (!Number.isInteger(staffId)) {
        return;
      }
      const key = String(staffId);
      const existing = map.get(key) ?? [];
      existing.push(row);
      map.set(key, existing);
    });
    return map;
  }, [availabilityRows]);

  const isSlotSchedulable = useCallback((resourceValue, startValue, endValue) => {
    // TEMP (Sprint testing): bypass all schedulability checks.
    if (!ENABLE_AVAILABILITY_BLOCKING) {
      return true;
    }

    const startDate = toNativeDate(startValue);
    const endDate = toNativeDate(endValue);
    if (!startDate || !endDate || endDate <= startDate) {
      return false;
    }

    const parsedResource = parseSchedulerResourceId(resourceValue);
    if (parsedResource.isEventOnlyRow) {
      const eventWindow = eventTimeWindowsById[String(parsedResource.eventId)];
      if (!eventWindow?.start || !eventWindow?.end) {
        return false;
      }

      const eventStart = toNativeDate(eventWindow.start);
      const eventEnd = toNativeDate(eventWindow.end);
      if (!eventStart || !eventEnd) {
        return false;
      }

      return startDate >= eventStart && endDate <= eventEnd;
    }

    const resource = resources.find((row) => String(row.id) === String(parsedResource.resourceId));
    if (!resource) {
      return false;
    }

    const requiredRoles = getRequiredRolesForResource(resource.name);
    if (requiredRoles.length === 0) {
      return true;
    }

    const dayName = startDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const startMinutes = (startDate.getHours() * 60) + startDate.getMinutes();
    const endMinutes = (endDate.getHours() * 60) + endDate.getMinutes();

    return requiredRoles.every((role) => {
      const directStaffIds = staffIdsByRole.get(role) ?? [];
      const fallbackRoles = ROLE_FALLBACKS[role] ?? [];
      const fallbackStaffIds = fallbackRoles.flatMap((fallbackRole) => staffIdsByRole.get(fallbackRole) ?? []);
      const matchingStaffIds = Array.from(new Set([...directStaffIds, ...fallbackStaffIds]));

      // Don't hard-block the whole scheduler if this environment doesn't use this role label.
      if (matchingStaffIds.length === 0) {
        return true;
      }

      return matchingStaffIds.some((staffId) => {
        const windows = availabilityByStaffId.get(String(staffId)) ?? [];
        return windows.some((window) => {
          const isAvailableFlag = Number.parseInt(window?.is_available, 10);
          if (isAvailableFlag === 0) {
            return false;
          }
          if (String(window?.day_of_week ?? "").trim().toLowerCase() !== dayName) {
            return false;
          }

          const windowStart = toMinutesFromTimeString(window?.start_time);
          const windowEnd = toMinutesFromTimeString(window?.end_time);
          if (windowStart === null || windowEnd === null) {
            return false;
          }

          return windowStart <= startMinutes && windowEnd >= endMinutes;
        });
      });
    });
  }, [availabilityByStaffId, eventTimeWindowsById, resources, staffIdsByRole]);

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
        { name: "Ticket Tier", id: "ticket_tier", type: "select", options: ticketTierOptions },
        { name: "Quantity", id: "quantity", type: "number" },
        base[2],
        base[3]
      ];
    }

    return base;
  };

  const editEvent = async (e) => {
    const { resourceId, eventId, isEventOnlyRow } = parseSchedulerResourceId(e.data.resource);
    const defaultTicketResource =
      resources.find((r) => r?.name === "Event Ticket GA") ||
      resources.find((r) => isTicketResource(r));
    const effectiveResourceId = isEventOnlyRow ? defaultTicketResource?.id : resourceId;
    const resource = resources.find(r => String(r.id) === String(effectiveResourceId));
    const defaultTier =
      resource?.name === "Event Ticket VIP"
        ? "VIP"
        : "GA";
    const modalData = {
      ...e.data,
      resource: effectiveResourceId,
      event_id: e.data.event_id ?? eventId ?? "",
      ticket_tier: normalizeTicketTier(e.data.ticket_tier ?? defaultTier)
    };
    const modal = await DayPilot.Modal.form(buildReservationForm(resource), modalData);
    if (modal.canceled) {
      return;
    }

    let updatedResourceId = modal.result.resource;
    if (
      resource &&
      isTicketResource(resource) &&
      modal.result.event_id !== undefined &&
      modal.result.event_id !== null &&
      modal.result.event_id !== ""
    ) {
      updatedResourceId = toTicketEventRowId(modal.result.resource, modal.result.event_id);
    }

    scheduler.events.update({
      ...modal.result,
      resource: updatedResourceId
    });
  };

const onTimeRangeSelected = async (args) => {
    if (ENABLE_AVAILABILITY_BLOCKING && !isSlotSchedulable(args.resource, args.start, args.end)) {
      scheduler?.clearSelection();
      await DayPilot.Modal.alert("That time range can't be reserved. Please choose a highlighted available range.");
      return;
    }

    const { resourceId, eventId, isEventOnlyRow } = parseSchedulerResourceId(args.resource);
    const defaultTicketResource =
      resources.find((r) => r?.name === "Event Ticket GA") ||
      resources.find((r) => isTicketResource(r));
    const effectiveResourceId = isEventOnlyRow ? defaultTicketResource?.id : resourceId;
    const selectedResource = resources.find(r => String(r.id) === String(effectiveResourceId));
    const defaultTier = selectedResource?.name === "Event Ticket VIP" ? "VIP" : "GA";
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
      resource: effectiveResourceId,
      text: "New Event",
      resource_description: selectedResource.description || "",
      event_id: eventId ?? "",
      ticket_tier: normalizeTicketTier(defaultTier),
      minimum_spend: minimumSpend
    };

    while (true) {
      const modal = await DayPilot.Modal.form(buildReservationForm(selectedResource), modalData);
      if (modal.canceled) return;
      modalData = { ...modalData, ...modal.result };

      const payload = {
        user_id: localStorage.getItem('userId') || 1,
        resource_id: effectiveResourceId,
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
        const selectedTier = normalizeTicketTier(modalData.ticket_tier);
        const ticketResourceForTier = getTicketResourceByTier(selectedTier);

        if (!ticketResourceForTier) {
          alert(`Could not find inventory row for ${selectedTier} ticket resource.`);
          continue;
        }

        payload.resource_id = ticketResourceForTier.id;
        payload.service_type = ticketResourceForTier.name;
        payload.event_id = modalData.event_id || eventId;
        payload.ticket_tier = selectedTier;
        payload.quantity = modalData.quantity;
        if (!payload.event_id || !payload.ticket_tier || !payload.quantity) {
          alert("Please fill out event ID, ticket tier, and quantity.");
          continue;
        }
      }

      try {
        const response = await fetch('/api/reservations.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const rawResponseText = await response.text();
        // DEBUG (disabled): raw API response logger for reservation POST troubleshooting.
        // console.log("[RESERVATION_POST_RAW_RESPONSE]", {
        //   status: response.status,
        //   ok: response.ok,
        //   body: rawResponseText
        // });

        let responseData = {};
        if (rawResponseText) {
          try {
            responseData = JSON.parse(rawResponseText);
          } catch (parseError) {
            console.error("[RESERVATION_POST_PARSE_ERROR]", parseError);
          }
        }

        if (response.ok) {
          const reservationId = responseData?.reservation_id;
          const assignedStaff = Array.isArray(responseData?.assigned_staff) ? responseData.assigned_staff : [];
          const emailSummary = await dispatchStaffAssignmentEmails({
            templateType: "SR-BU",
            title: `Reservation Assignment #${reservationId ?? "N/A"}`,
            timeWindow: `${responseData?.start_time ?? payload.start_time} - ${responseData?.end_time ?? payload.end_time}`,
            message: `You have been assigned to reservation ${reservationId ?? "N/A"} for ${responseData?.resource_name ?? selectedResource?.name ?? "reservation"}.`,
            staffMembers: assignedStaff
          });
          console.info("[EMAIL_TRIGGER_FRONTEND] Reservation created from scheduler; frontend email dispatch summary:", emailSummary);
          // DEBUG (disabled): assignment-email trigger expectation logger.
          // console.log("[EMAIL_TRIGGER_EXPECTED] Reservation saved; backend should attempt assignment emails.", {
          //   reservation_id: responseData?.reservation_id ?? null,
          //   resource_name: responseData?.resource_name ?? selectedResource?.name ?? null,
          //   assigned_staff: responseData?.assigned_staff ?? []
          // });
          await loadData();
          window.dispatchEvent(new Event('reservations:changed'));
          return;
        }

        let message = responseData?.message || "Could not save reservation.";
        if (responseData?.message) {
          console.error("Database save failed:", responseData.message);
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

  const onBeforeCellRender = useCallback((args) => {
    const existingClass = String(args.cell.cssClass ?? "")
      .replace(/\bscheduler-cell-available\b/g, "")
      .replace(/\bscheduler-cell-unavailable\b/g, "")
      .trim();

    if (!ENABLE_AVAILABILITY_BLOCKING) {
      args.cell.disabled = false;
      args.cell.backColor = "rgba(255, 255, 255, 0.34)";
      args.cell.cssClass = `${existingClass} scheduler-cell-available`.trim();
      return;
    }

    const canSchedule = isSlotSchedulable(args.cell.resource, args.cell.start, args.cell.end);

    // Always set disabled explicitly so cells can transition between states.
    args.cell.disabled = !canSchedule;

    if (canSchedule) {
      args.cell.backColor = "rgba(255, 255, 255, 0.34)";
      args.cell.cssClass = `${existingClass} scheduler-cell-available`.trim();
      return;
    }

    args.cell.backColor = "rgba(255, 255, 255, 0.08)";
    args.cell.cssClass = `${existingClass} scheduler-cell-unavailable`.trim();
  }, [isSlotSchedulable]);

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

        const [resourcesResponse, sectionsResponse, ticketEventsResponse, staffResponse, availabilityResponse] = await Promise.all([
          fetch('/api/inventory.php', { credentials: 'include' }),
          fetch('/api/sections.php', { credentials: 'include' }),
          fetch('/api/events.php', { credentials: 'include' }),
          fetch('/api/staff.php', { credentials: 'include' }),
          fetch('/api/availability.php', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
          })
        ]);

        const resourcesJson = await resourcesResponse.json();
        const resourcesData = Array.isArray(resourcesJson) ? resourcesJson : [];

        const formattedResources = resourcesData.map(r => ({
          name: r.name,
          id: r.id,
          type: r.type,
          description: r.description
        }));
        setResources(formattedResources);

        const ticketEventsJson = await ticketEventsResponse.json();
        const ticketEventsData = Array.isArray(ticketEventsJson) ? ticketEventsJson : [];
        const mappedTicketEvents = ticketEventsData.map(e => ({
          name: String(e.event_title || `Event ${e.event_id}`),
          id: e.event_id,
          start_time: e.start_time,
          end_time: e.end_time
        }));
        setEventOptions(mappedTicketEvents);

        const nextEventWindowMap = {};
        mappedTicketEvents.forEach((eventRow) => {
          nextEventWindowMap[String(eventRow.id)] = {
            start: eventRow.start_time,
            end: eventRow.end_time
          };
        });
        setEventTimeWindowsById(nextEventWindowMap);

        const staffJson = await staffResponse.json().catch(() => []);
        const nextStaffRows = Array.isArray(staffJson) ? staffJson : [];
        setStaffMembers(nextStaffRows);

        const availabilityJson = await availabilityResponse.json().catch(() => ({}));
        const nextAvailabilityRows = Array.isArray(availabilityJson)
          ? availabilityJson
          : Array.isArray(availabilityJson?.data)
            ? availabilityJson.data
            : [];
        setAvailabilityRows(nextAvailabilityRows);

        const nextStaffIdsByRole = new Map();
        nextStaffRows.forEach((member) => {
          const role = String(member?.role ?? "").trim();
          const staffId = Number.parseInt(member?.id, 10);
          if (!role || !Number.isInteger(staffId)) {
            return;
          }
          const existing = nextStaffIdsByRole.get(role) ?? [];
          existing.push(staffId);
          nextStaffIdsByRole.set(role, existing);
        });

        const nextAvailabilityByStaffId = new Map();
        nextAvailabilityRows.forEach((row) => {
          const staffId = Number.parseInt(row?.staff_id, 10);
          if (!Number.isInteger(staffId)) {
            return;
          }
          const key = String(staffId);
          const existing = nextAvailabilityByStaffId.get(key) ?? [];
          existing.push(row);
          nextAvailabilityByStaffId.set(key, existing);
        });

        const nonTicketResources = formattedResources.filter((resource) => !isTicketResource(resource));
        const schedulerRows = [...nonTicketResources];
        setSchedulerResources(schedulerRows);

        const roleCoverageByResource = nonTicketResources.map((resource) => {
          const requiredRoles = getRequiredRolesForResource(resource.name);
          if (requiredRoles.length === 0) {
            return {
              resource: resource.name,
              required_roles: "(none)",
              covered: true,
              details: "No role requirement"
            };
          }

          const roleDetails = requiredRoles.map((role) => {
            const staffIds = nextStaffIdsByRole.get(role) ?? [];
            const staffWithAvailability = staffIds.filter((id) => {
              const windows = nextAvailabilityByStaffId.get(String(id)) ?? [];
              return windows.length > 0;
            });

            return {
              role,
              staffCount: staffIds.length,
              availableStaffCount: staffWithAvailability.length
            };
          });

          return {
            resource: resource.name,
            required_roles: requiredRoles.join(", "),
            covered: roleDetails.every((row) => row.availableStaffCount > 0),
            details: roleDetails
              .map((row) => `${row.role}: ${row.availableStaffCount}/${row.staffCount}`)
              .join(" | ")
          };
        });

        console.groupCollapsed("[Scheduler Availability] Data snapshot");
        console.log("Responses", {
          reservations_ok: eventsResponse.ok,
          resources_ok: resourcesResponse.ok,
          sections_ok: sectionsResponse.ok,
          ticket_events_ok: ticketEventsResponse.ok,
          staff_ok: staffResponse.ok,
          availability_ok: availabilityResponse.ok,
          availability_status: availabilityResponse.status
        });
        console.log("Counts", {
          reservations: eventsData.length,
          resources: formattedResources.length,
          scheduler_rows: schedulerRows.length,
          ticket_events: mappedTicketEvents.length,
          staff_rows: nextStaffRows.length,
          availability_rows: nextAvailabilityRows.length
        });
        console.log(
          "Staff by role",
          Object.fromEntries(
            Array.from(nextStaffIdsByRole.entries()).map(([role, ids]) => [role, ids.length])
          )
        );
        console.table(roleCoverageByResource);
        console.table(
          mappedTicketEvents.slice(0, 5).map((eventRow) => ({
            event_id: eventRow.id,
            event_name: eventRow.name,
            start: eventRow.start_time,
            end: eventRow.end_time
          }))
        );
        if (nextAvailabilityRows.length === 0) {
          console.warn(
            "[Scheduler Availability] availability_rows is 0; schedulable cells for role-gated resources will be disabled."
          );
        }
        console.groupEnd();

        const ticketResourceIds = new Set(
          formattedResources
            .filter((resource) => isTicketResource(resource))
            .map((resource) => String(resource.id))
        );

        // Mapping the DB fields to DayPilot fields
        const seenReservationIds = new Set();
        const duplicateReservationIds = new Set();
        const formattedEvents = eventsData.reduce((acc, e, index) => {
          // Ticket reservations are now rendered as event cards, not scheduler bars.
          if (ticketResourceIds.has(String(e?.resource_id))) {
            return acc;
          }

          const reservationId = e?.reservation_id;
          const hasReservationId = reservationId !== null && reservationId !== undefined && reservationId !== "";
          const schedulerEventId = hasReservationId
            ? String(reservationId)
            : `missing-reservation-id-${index}`;

          if (seenReservationIds.has(schedulerEventId)) {
            duplicateReservationIds.add(schedulerEventId);
            return acc;
          }
          seenReservationIds.add(schedulerEventId);

          acc.push({
            id: schedulerEventId,
            text: e.resource_name || e.service_type,
            start: e.start_time,
            end: e.end_time,
            resource: e.resource_id,
            status: e.status,
            event_id: e.event_id
          });
          return acc;
        }, []);

        if (duplicateReservationIds.size > 0) {
          console.warn(
            "Dropped duplicate reservation rows while building scheduler events:",
            Array.from(duplicateReservationIds)
          );
        }
        setEvents(formattedEvents);

        const sectionsJson = await sectionsResponse.json();
        const sectionsData = Array.isArray(sectionsJson) ? sectionsJson : [];
        setSectionOptions(sectionsData.map(s => ({
          name: String(s.section_number),
          id: s.section_number
        })));

        const flattenResourceIds = (rows) => {
          const ids = [];
          rows.forEach((row) => {
            ids.push(String(row.id));
            if (Array.isArray(row.children)) {
              row.children.forEach((child) => ids.push(String(child.id)));
            }
          });
          return ids;
        };
        const resourceIdSet = new Set(flattenResourceIds(schedulerRows));
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
        timeRangeSelectedHandling={"Enabled"}
        timeRangeClickHandling={"Enabled"}
        startDate={startDate}
        days={days}
        rowHeaderWidth={240}
        cellWidth={60}
        eventHeight={40}
        events={events}
        resources={schedulerResources}
        onBeforeEventRender={onBeforeEventRender}
        onBeforeCellRender={onBeforeCellRender}
        onTimeRangeSelected={onTimeRangeSelected}
        controlRef={setScheduler}
        theme={theme}
      />
    </div>
  );
}
export default ReactScheduler;
