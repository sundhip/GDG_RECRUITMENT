"use client";
import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterDepartment from "./FilterDepartment";
import FilterShortlisted from "./FilterShortlisted";
import { FaSortAmountDownAlt } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { curDate, curMonth, curYear, months } from "@/constants";
import { IoCloudDownloadOutline } from "react-icons/io5";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  useFilters,
  usePagination,
  useRowSelect,
} from "react-table";
import { Input } from "@/components/ui/input";
import PaginationComp from "./PaginationComp";
import DialogComp from "./DialogComp";
import { CSV_Header } from "@/constants";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Check,
  AlertTriangle,
  X,
  FileText,
  Columns,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lazy-load heavy dependencies to reduce initial admin bundle size
const MailComposer = dynamic(() => import("./MailComposer"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled className="border-slate-700 text-slate-400">
      Custom Mail
    </Button>
  ),
});

const CSVLink = dynamic(
  () => import("react-csv").then((mod) => mod.CSVLink),
  {
    ssr: false,
    loading: () => (
      <span className="flex gap-2 items-center">
        <IoCloudDownloadOutline /> Download CSV
      </span>
    ),
  }
);

const IndeterminateCheckbox = React.forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = React.useRef();
  const resolvedRef = ref || defaultRef;

  React.useEffect(() => {
    if (resolvedRef.current) {
      resolvedRef.current.indeterminate = indeterminate;
    }
  }, [resolvedRef, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={resolvedRef}
      {...rest}
      className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
    />
  );
});
IndeterminateCheckbox.displayName = "IndeterminateCheckbox";

const DataTable = ({ data = [] }) => {
  const [tableData, setTableData] = useState(data);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedShortlisted, setSelectedShortlisted] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    applicant: null,
    targetShortlistState: false,
  });

  // Operational KPI Metrics (Calculated purely from dataset in-memory with 0 extra reads)
  const stats = useMemo(() => {
    const total = tableData.length;
    const shortlisted = tableData.filter((item) => Boolean(item.shortlisted)).length;
    const pending = total - shortlisted;
    const depts = new Set(
      tableData
        .map((item) => item.Department || item.departmentName)
        .filter(Boolean)
    ).size;

    return { total, shortlisted, pending, depts };
  }, [tableData]);

  // Derived filtered data (Single Source of Truth)
  const filteredData = useMemo(() => {
    let result = tableData;
    if (selectedDepartment) {
      result = result.filter(
        (item) =>
          item.Department === selectedDepartment ||
          item.departmentName === selectedDepartment
      );
    }
    if (selectedShortlisted) {
      const isTarget =
        selectedShortlisted === "true" || selectedShortlisted === "Shortlisted";
      result = result.filter((item) => Boolean(item.shortlisted) === isTarget);
    }
    return result;
  }, [tableData, selectedDepartment, selectedShortlisted]);

  const filterFunc = (dept) => {
    setSelectedDepartment(dept || "");
  };

  const shortlistedFilterFunc = (status) => {
    setSelectedShortlisted(status || "");
  };

  const openShortlistConfirmation = (applicant) => {
    setConfirmModal({
      isOpen: true,
      applicant,
      targetShortlistState: !applicant.shortlisted,
    });
  };

  const executeShortlistUpdate = async () => {
    const { applicant, targetShortlistState } = confirmModal;
    if (!applicant) return;

    const id = applicant._id || applicant.id || applicant.submissionId;
    setConfirmModal({ isOpen: false, applicant: null, targetShortlistState: false });

    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: targetShortlistState }),
      });

      if (res.ok) {
        setTableData((prev) =>
          prev.map((item) => {
            const appId = item._id || item.id || item.submissionId;
            if (appId === id) {
              return {
                ...item,
                shortlisted: targetShortlistState,
                status: targetShortlistState ? "shortlisted" : "submitted",
              };
            }
            return item;
          })
        );
        toast.success(
          `Applicant ${applicant.Name || ""} ${
            targetShortlistState ? "shortlisted successfully" : "removed from shortlist"
          }!`
        );
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error.message);
      toast.error("Failed to update status");
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "selection",
        Header: ({ getToggleAllPageRowsSelectedProps }) => (
          <div className="flex items-center justify-center">
            <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
          </div>
        ),
        Cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
          </div>
        ),
      },
      {
        Header: "#",
        accessor: (row, index) => index + 1,
      },
      {
        Header: "Applicant Name",
        accessor: "Name",
        Cell: ({ row }) => (
          <div className="font-medium text-slate-100">{row.original.Name || "—"}</div>
        ),
      },
      {
        Header: "Reg Number",
        accessor: "RegistrationNumber",
        Cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">
            {row.original.RegistrationNumber || "—"}
          </span>
        ),
      },
      {
        Header: "Email Address",
        accessor: "Email",
        Cell: ({ row }) => (
          <span className="text-xs text-slate-400 font-mono">
            {row.original.Email || "—"}
          </span>
        ),
      },
      {
        Header: "Phone",
        accessor: "Phone",
        Cell: ({ row }) => (
          <span className="text-xs text-slate-300">
            {row.original.Phone || "—"}
          </span>
        ),
      },
      {
        Header: "Department",
        accessor: "Department",
        Cell: ({ row }) => (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
            {row.original.Department || row.original.departmentName || "General"}
          </span>
        ),
      },
      {
        Header: "Recruitment Phase",
        accessor: "currentPhase",
        Cell: ({ row }) => {
          const p = row.original.currentPhase || (row.original.shortlisted ? 4 : 1);
          const badgeClass =
            p === 6
              ? "bg-emerald-950 text-emerald-300 border-emerald-700"
              : p === 5
              ? "bg-pink-950 text-pink-300 border-pink-700"
              : p === 4
              ? "bg-purple-950 text-purple-300 border-purple-700"
              : p === 3
              ? "bg-indigo-950 text-indigo-300 border-indigo-700"
              : p === 2
              ? "bg-amber-950 text-amber-300 border-amber-700"
              : "bg-blue-950 text-blue-300 border-blue-700";

          return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
              Phase {p}
            </span>
          );
        },
      },
      {
        Header: "Review Status",
        accessor: "shortlisted",
        Cell: ({ row }) => {
          const isShortlisted = Boolean(row.original.shortlisted);
          return (
            <button
              type="button"
              onClick={() => openShortlistConfirmation(row.original)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isShortlisted
                  ? "bg-emerald-950/80 hover:bg-red-950/80 text-emerald-300 hover:text-red-300 border border-emerald-800/80 hover:border-red-800"
                  : "bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-800"
              }`}
            >
              {isShortlisted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Shortlisted</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pending</span>
                </>
              )}
            </button>
          );
        },
      },
      {
        Header: "Workspace",
        accessor: "actions",
        Cell: ({ row }) => {
          const appId = row.original._id || row.original.id || row.original.submissionId;
          return (
            <Link href={`/admin/review/${appId}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Review</span>
              </Button>
            </Link>
          );
        },
      },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    selectedFlatRows,
    state: { pageIndex, pageSize, globalFilter },
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: filteredData,
      initialState: { pageSize: 10 },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect
  );

  const handlePageSize = (e) => {
    const size = Number(e.target.value);
    if (size > 0) {
      setPageSize(size);
    } else {
      setPageSize(10);
    }
  };

  const handleRowSelection = async (payloadData) => {
    const selectedApplicants = selectedFlatRows.map((row) => row.original);
    const request = {
      recipients: selectedApplicants,
      payloadData,
    };

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        toast.success("Interview invite sent to recipients!", {
          description: `On ${months[curMonth - 1] || "Date"} ${curDate}, ${curYear}`,
        });
      } else {
        toast.error("Failed to send invite");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send invite");
    }
  };

  const showRowData = () => selectedFlatRows.map((row) => row.original);

  const formatQuestionsForCsv = (item) => {
    if (Array.isArray(item?.answers) && item.answers.length > 0) {
      return item.answers
        .map((a) => `${a.questionText || a.questionId}: ${a.value}`)
        .join(" | ");
    }
    if (!item?.Questions) return "";
    if (typeof item.Questions === "object") {
      return Object.entries(item.Questions)
        .map(([q, a]) => `${q}: ${a}`)
        .join(" | ");
    }
    return String(item.Questions);
  };

  const csv_link = useMemo(
    () => ({
      headers: CSV_Header,
      data: tableData.map((item) => ({
        ...item,
        Questions: formatQuestionsForCsv(item),
      })),
    }),
    [tableData]
  );

  return (
    <div className="space-y-6">
      {/* 1. Operational KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-xs text-slate-400 font-medium">Total Applications</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{stats.shortlisted}</div>
            <div className="text-xs text-slate-400 font-medium">Shortlisted Candidates</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{stats.pending}</div>
            <div className="text-xs text-slate-400 font-medium">Pending Review</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{stats.depts}</div>
            <div className="text-xs text-slate-400 font-medium">Active Departments</div>
          </div>
        </div>
      </div>

      {/* 2. Operations Toolbar */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={globalFilter || ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search by name, reg, email..."
              className="pl-9 bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <FilterDepartment filterFunc={filterFunc} />
          <FilterShortlisted filterFunc={shortlistedFilterFunc} />

          {(selectedDepartment || selectedShortlisted || globalFilter) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedDepartment("");
                setSelectedShortlisted("");
                setGlobalFilter("");
              }}
              className="text-xs text-slate-400 hover:text-slate-200 h-9 gap-1"
            >
              <GrPowerReset className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedFlatRows.length === 2 && (
            <Link
              href={`/admin/compare?id1=${
                selectedFlatRows[0].original._id ||
                selectedFlatRows[0].original.id ||
                selectedFlatRows[0].original.submissionId
              }&id2=${
                selectedFlatRows[1].original._id ||
                selectedFlatRows[1].original.id ||
                selectedFlatRows[1].original.submissionId
              }`}
            >
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 px-3 text-xs gap-1.5 shadow-md shadow-indigo-950"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Compare Selected (2)</span>
              </Button>
            </Link>
          )}
          <DialogComp selectedApplicants={showRowData} />
          <MailComposer
            recipients={selectedFlatRows.length}
            handleRowSelection={handleRowSelection}
          />
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 h-9"
          >
            <CSVLink
              {...csv_link}
              filename={`applicants_${new Date().toISOString().slice(0, 10)}.csv`}
              className="flex gap-1.5 justify-center items-center text-xs"
            >
              <IoCloudDownloadOutline className="w-4 h-4" />
              <span>Export CSV</span>
            </CSVLink>
          </Button>
        </div>
      </div>

      {/* 3. Applicant Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 shadow-xl">
        <Table {...getTableProps()}>
          <TableHeader className="bg-slate-950/80 border-b border-slate-800">
            {headerGroups.map((hg) => (
              <TableRow key={hg.id} {...hg.getHeaderGroupProps()}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    {...header.getHeaderProps(header.getSortByToggleProps())}
                    className="text-xs font-semibold text-slate-400"
                  >
                    <div className="inline-flex gap-1.5 items-center">
                      {header.render("Header")}
                      {header.id !== "selection" && (
                        <FaSortAmountDownAlt className="w-2.5 h-2.5 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {page.length > 0 ? (
              page.map((row) => {
                prepareRow(row);
                const rowKey =
                  row.original._id || row.original.id || row.original.submissionId || row.id;
                const isSelected = row.isSelected;

                return (
                  <TableRow
                    key={rowKey}
                    {...row.getRowProps()}
                    className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                      isSelected ? "bg-blue-950/30" : ""
                    }`}
                  >
                    {row.cells.map((cell) => (
                      <TableCell
                        key={cell.column.id || cell.id}
                        {...cell.getCellProps()}
                        className="py-3 text-xs text-slate-300"
                      >
                        {cell.render("Cell")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                  No applicant records found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Pagination */}
      <PaginationComp
        pageIndex={pageIndex}
        pages={pageOptions.length}
        nextPage={nextPage}
        canNext={canNextPage}
        previousPage={previousPage}
        canPrev={canPreviousPage}
        goto={gotoPage}
        pageCount={pageCount}
      />

      {/* 5. Shortlist Confirmation Modal */}
      <Dialog
        open={confirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmModal({ isOpen: false, applicant: null, targetShortlistState: false });
        }}
      >
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Confirm Status Change</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Please confirm the evaluation decision for this candidate.
            </DialogDescription>
          </DialogHeader>

          {confirmModal.applicant && (
            <div className="my-3 p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Applicant: </span>
                <span className="font-bold text-slate-200">{confirmModal.applicant.Name}</span>
              </div>
              <div>
                <span className="text-slate-400">Department: </span>
                <span className="text-slate-300">{confirmModal.applicant.Department}</span>
              </div>
              <div>
                <span className="text-slate-400">Action: </span>
                <span
                  className={`font-semibold ${
                    confirmModal.targetShortlistState ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {confirmModal.targetShortlistState
                    ? "Mark as Shortlisted for Interview"
                    : "Revert back to Pending Review"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirmModal({ isOpen: false, applicant: null, targetShortlistState: false })
              }
              className="border-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executeShortlistUpdate}
              className={
                confirmModal.targetShortlistState
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataTable;

