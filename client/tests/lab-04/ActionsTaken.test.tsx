import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { fetchTicketDetails, createActionTaken, updateTicketStatus } from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  return {
    fetchRequesters: vi.fn().mockResolvedValue([]),
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchSystems: vi.fn().mockResolvedValue([]),
    fetchAssignees: vi.fn().mockResolvedValue([]),
    fetchTickets: vi.fn().mockResolvedValue({ tickets: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 } }),
    fetchAdminUsers: vi.fn().mockResolvedValue([]),
    createActionTaken: vi.fn().mockResolvedValue({}),
    updateTicketStatus: vi.fn().mockResolvedValue({}),
    fetchStaffDashboard: vi.fn().mockResolvedValue({
      metrics: { unassigned: 0, myAssigned: 0, myActionsTakenCount: 2, new: 0, open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, closed: 0, byPriority: { high: 0, medium: 0, low: 0 } },
      recentTickets: [],
      myRecentActions: [],
    }),
    fetchTicketDetails: vi.fn().mockResolvedValue({
      id: 101,
      ticketNo: "TKT-2026-000101",
      requesterId: 2,
      requester: { id: 2, name: "Jennifer Anderson", email: "jennifer@example.com" },
      ownerId: 10,
      owner: { id: 10, name: "Tech Support", email: "tech@example.com" },
      categoryId: 1,
      category: { id: 1, name: "Hardware" },
      relatedSystem: "Laptop",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "In Progress",
      requesterResolvedIndication: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
    }),
    fetchComments: vi.fn().mockResolvedValue([]),
    fetchNotes: vi.fn().mockResolvedValue([]),
    fetchActionsTaken: vi.fn().mockResolvedValue([
      {
        id: 1,
        ticketId: 101,
        actionDateTime: new Date().toISOString(),
        actionDescription: "Replaced hardware memory",
        result: "Working fine",
        performedById: 10,
        performedBy: { id: 10, name: "Tech Support", email: "tech@example.com", role: "ITStaff" },
        followUpRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        ticketId: 101,
        actionDateTime: new Date().toISOString(),
        actionDescription: "Ran MemTest86 diagnostic pass",
        result: "0 memory errors detected",
        performedById: 11,
        performedBy: { id: 11, name: "Second Specialist", email: "spec2@example.com", role: "ITStaff" },
        followUpRequired: true,
        followUpNote: "Confirm stability with user after 48 hours",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  };
});

describe("Actions Taken Work Tracker UI", () => {
  it("refreshes the ticket version after recording an action before resolving", async () => {
    const ticket = await fetchTicketDetails(101);
    const before = "2026-10-21T10:00:00.000Z";
    const after = "2026-10-21T10:01:00.000Z";
    vi.mocked(fetchTicketDetails).mockReset()
      .mockResolvedValue({ ...ticket, updatedAt: after })
      .mockResolvedValueOnce({ ...ticket, updatedAt: before });
    vi.mocked(createActionTaken).mockClear();
    vi.mocked(updateTicketStatus).mockClear();
    sessionStorage.clear();
    sessionStorage.setItem("auth_token", "staff-token");
    sessionStorage.setItem("current_screen", "detail");
    sessionStorage.setItem("current_ticket_id", "101");
    sessionStorage.setItem("current_user", JSON.stringify({
      id: 10, name: "Tech Support", email: "tech@example.com", role: "ITStaff",
      isActive: true, mustChangePassword: false,
    }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByPlaceholderText("Record action taken description..."), "Fixed and verified");
    await user.click(screen.getByRole("button", { name: "Record Action" }));
    await waitFor(() => expect(fetchTicketDetails).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Update Status" })).not.toBeDisabled());
    await user.selectOptions(screen.getByRole("combobox", { name: "Update Status" }), "Resolved");
    await waitFor(() => expect(updateTicketStatus).toHaveBeenCalledWith(101, {
      currentStatus: "Resolved", expectedUpdatedAt: after,
    }));
  });

  it("renders the Actions Taken section, multi-staff entries, and record/edit form controls", async () => {
    sessionStorage.clear();
    sessionStorage.setItem("auth_token", "staff-token");
    sessionStorage.setItem("current_screen", "detail");
    sessionStorage.setItem("current_ticket_id", "101");
    sessionStorage.setItem(
      "current_user",
      JSON.stringify({
        id: 10,
        name: "Tech Support",
        email: "tech@example.com",
        role: "ITStaff",
        isActive: true,
        mustChangePassword: false,
      })
    );

    render(<App />);
    expect(await screen.findByText(/Actions Taken \(Work Tracker\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/Replaced hardware memory/i)).toBeInTheDocument();
    expect(await screen.findByText(/Ran MemTest86 diagnostic pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Record Action/i)).toBeInTheDocument();
  });
});
