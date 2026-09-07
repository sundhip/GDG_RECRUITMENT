"use client";

import React, { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { mailingTemplate } from "@/constants";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CiWarning } from "react-icons/ci";
import { Input } from "./ui/input";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, RotateCcw, Send, CheckCircle2 } from "lucide-react";

export default function MailComposer({ recipients = 0, handleRowSelection }) {
    const [payloadData, setPayloadData] = useState({
        subject: "",
        body: "",
        mailType: "Blank",
    });

    const [confirm, setConfirm] = useState(false);

    const templateTypes = ["Blank", "Interview Invite"];

    const handleFormat = (tag) => {
        const textarea = document.getElementById("mail-body-editor");
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        let replacement = "";

        switch (tag) {
            case "bold":
                replacement = `<strong>${selected || "Bold Text"}</strong>`;
                break;
            case "italic":
                replacement = `<em>${selected || "Italic Text"}</em>`;
                break;
            case "h1":
                replacement = `<h1>${selected || "Heading 1"}</h1>\n`;
                break;
            case "h2":
                replacement = `<h2>${selected || "Heading 2"}</h2>\n`;
                break;
            case "ul":
                replacement = `<ul>\n  <li>${selected || "List item"}</li>\n</ul>\n`;
                break;
            case "ol":
                replacement = `<ol>\n  <li>${selected || "Step 1"}</li>\n</ol>\n`;
                break;
            case "clear":
                setPayloadData((prev) => ({ ...prev, body: "" }));
                return;
            default:
                replacement = selected;
        }

        const newBody = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        setPayloadData((prev) => ({ ...prev, body: newBody }));
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs sm:text-sm">
                    Custom Mail
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[85vw] md:max-w-[700px] bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-100">Send Custom Mail</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs sm:text-sm">
                        Send customized email notifications to {recipients} selected candidate{recipients === 1 ? "" : "s"}.
                    </DialogDescription>
                </DialogHeader>

                {recipients !== 0 ? (
                    <div className="flex flex-col gap-4 py-2">
                        {/* Subject and Template Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 items-center">
                            <div className="sm:col-span-2">
                                <Input
                                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-500"
                                    placeholder="Email Subject..."
                                    value={payloadData.subject}
                                    onChange={(e) =>
                                        setPayloadData((prev) => ({
                                            ...prev,
                                            subject: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <Select
                                    value={payloadData.mailType}
                                    onValueChange={(value) => {
                                        let newBody = "";
                                        if (value === "Interview Invite") {
                                            newBody = mailingTemplate?.Interview || "Dear Applicant,\n\nWe are pleased to invite you for an interview regarding your application.\n\nBest regards,\nRecruitment Team";
                                        }
                                        setPayloadData((prev) => ({
                                            ...prev,
                                            mailType: value,
                                            body: newBody,
                                        }));
                                    }}
                                >
                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                                        <SelectValue placeholder="Templates" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                        {templateTypes.map((tmp) => (
                                            <SelectItem key={tmp} value={tmp}>
                                                {tmp}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Formatting Toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 border border-slate-800 rounded-md">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("bold")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Bold"
                            >
                                <Bold className="w-3.5 h-3.5 mr-1" /> Bold
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("italic")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Italic"
                            >
                                <Italic className="w-3.5 h-3.5 mr-1" /> Italic
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("h1")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Heading 1"
                            >
                                <Heading1 className="w-3.5 h-3.5 mr-1" /> H1
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("h2")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Heading 2"
                            >
                                <Heading2 className="w-3.5 h-3.5 mr-1" /> H2
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("ul")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Bullet List"
                            >
                                <List className="w-3.5 h-3.5 mr-1" /> Bullets
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("ol")}
                                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-800"
                                title="Numbered List"
                            >
                                <ListOrdered className="w-3.5 h-3.5 mr-1" /> Numbered
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFormat("clear")}
                                className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 ml-auto"
                                title="Clear Content"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
                            </Button>
                        </div>

                        {/* Editor Body */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="mail-body-editor" className="text-xs font-medium text-slate-400">
                                Message Content (HTML & Plain Text Supported)
                            </label>
                            <textarea
                                id="mail-body-editor"
                                rows={8}
                                className="w-full font-mono text-xs sm:text-sm p-3 rounded-md bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
                                placeholder="Type or compose your message here..."
                                value={payloadData.body}
                                onChange={(e) =>
                                    setPayloadData((prev) => ({
                                        ...prev,
                                        body: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        {/* Footer Controls */}
                        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
                            <div className="text-xs text-slate-400">
                                {confirm ? (
                                    <span className="text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready to dispatch to {recipients} candidates
                                    </span>
                                ) : (
                                    <span>Please verify email content before dispatching</span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {!confirm ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirm(true)}
                                        disabled={!payloadData.subject || !payloadData.body}
                                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    >
                                        Verify Mail
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirm(false)}
                                        className="border-emerald-600/60 bg-emerald-950/30 text-emerald-300"
                                    >
                                        Verified ✓ (Edit)
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!confirm}
                                    onClick={() => {
                                        if (confirm && typeof handleRowSelection === "function") {
                                            handleRowSelection(payloadData);
                                            setConfirm(false);
                                        }
                                    }}
                                    className={`${
                                        confirm
                                            ? "bg-blue-600 hover:bg-blue-500 text-white"
                                            : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"
                                    } transition-all flex items-center gap-1.5`}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    Send Mail
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="py-6 flex items-center justify-center gap-2 text-amber-400 text-sm">
                        <CiWarning className="w-5 h-5" />
                        <span>No candidates selected. Please select candidates in the table first.</span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
