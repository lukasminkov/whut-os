"use client";

import { useMemo, useState } from "react";
import {
  Cloud,
  Folder,
  FolderOpen,
  FileText,
  FileBarChart2,
  Image as ImageIcon,
  Plus,
  Upload,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  Link as LinkIcon,
  Sparkles,
  ChevronDown,
} from "lucide-react";

type DocFile = {
  id: string;
  name: string;
  modified: string;
  type: "doc" | "sheet" | "image";
  content: string;
};

type FolderNode = {
  id: string;
  name: string;
  files: DocFile[];
  section: "google" | "local";
};

const initialFolders: FolderNode[] = [
  {
    id: "marketing",
    name: "Marketing",
    section: "google",
    files: [
      {
        id: "campaign-brief-q1",
        name: "Campaign Brief Q1.doc",
        modified: "Feb 2, 2026",
        type: "doc",
        content:
          "<p><strong>Q1 Campaign Overview</strong></p>\n<p>We are launching a multi-channel awareness campaign focused on WHUT OS as the all-in-one creator business stack. The primary goal is to increase brand visibility by 25% and drive a 15% lift in inbound creator applications.</p>\n<p>The campaign will run across paid social, creator partnerships, and targeted newsletters. Messaging will emphasize speed to monetize, transparent payouts, and beautiful reporting.</p>\n<p>Success will be measured by qualified lead volume, CTR, and conversion rate from the campaign landing page.</p>",
      },
      {
        id: "brand-guidelines",
        name: "Brand Guidelines.doc",
        modified: "Jan 21, 2026",
        type: "doc",
        content:
          "<p><strong>Brand Voice</strong></p>\n<p>WHUT OS speaks with clarity, confidence, and optimism. We empower creators to feel in control of their business while keeping language human and modern.</p>\n<p>Use short, active sentences. Avoid jargon. Focus on outcomes: faster payouts, smarter insights, and beautiful client experiences.</p>",
      },
      {
        id: "social-strategy",
        name: "Social Strategy.doc",
        modified: "Jan 9, 2026",
        type: "doc",
        content:
          "<p><strong>Social Strategy</strong></p>\n<p>Our social presence should inspire action and showcase creator success stories. Prioritize behind-the-scenes product demos, creator spotlights, and data-driven wins.</p>\n<p>Post cadence: 3x weekly on Instagram and TikTok, 2x weekly on LinkedIn. Use short-form video for feature highlights.</p>",
      },
    ],
  },
  {
    id: "contracts",
    name: "Contracts",
    section: "google",
    files: [
      {
        id: "creator-agreement-template",
        name: "Creator Agreement Template.doc",
        modified: "Dec 18, 2025",
        type: "doc",
        content:
          "<p><strong>Creator Agreement Template</strong></p>\n<p>This Agreement outlines the scope of work, deliverables, timelines, and payment terms between WHUT OS and the Creator. All parties agree to comply with disclosure guidelines and brand safety standards.</p>\n<p>Deliverables include a minimum of three short-form videos and one long-form feature. Payment is due within 7 days of approved delivery.</p>",
      },
      {
        id: "nda-template",
        name: "NDA Template.doc",
        modified: "Dec 4, 2025",
        type: "doc",
        content:
          "<p><strong>Non-Disclosure Agreement</strong></p>\n<p>The Recipient agrees to keep all confidential information private and to use it solely for the purpose of evaluating a potential business relationship with WHUT OS.</p>\n<p>This obligation remains in effect for two years following the date of disclosure.</p>",
      },
    ],
  },
  {
    id: "reports",
    name: "Reports",
    section: "google",
    files: [
      {
        id: "monthly-revenue-jan",
        name: "Monthly Revenue Jan.doc",
        modified: "Feb 1, 2026",
        type: "sheet",
        content:
          "<p><strong>January Revenue Report</strong></p>\n<p>Total revenue: <strong>$128,400</strong>. Top channel: enterprise partners (42%). Average deal size increased by 12% month-over-month.</p>\n<p>Key drivers include improved onboarding and higher conversion on the pricing page.</p>",
      },
      {
        id: "monthly-revenue-feb",
        name: "Monthly Revenue Feb.doc",
        modified: "Mar 1, 2026",
        type: "sheet",
        content:
          "<p><strong>February Revenue Report</strong></p>\n<p>Total revenue: <strong>$142,950</strong>. Growth driven by creator referrals and a 9% increase in mid-tier plan upgrades.</p>\n<p>Retention improved to 94% with lower churn from small agencies.</p>",
      },
      {
        id: "creator-performance",
        name: "Creator Performance.doc",
        modified: "Feb 22, 2026",
        type: "sheet",
        content:
          "<p><strong>Creator Performance Summary</strong></p>\n<p>Top 20 creators delivered a combined 6.2M impressions with an average engagement rate of 4.8%.</p>\n<p>UGC conversion lifted by 1.6x versus brand-only content.</p>",
      },
      {
        id: "campaign-roi-analysis",
        name: "Campaign ROI Analysis.doc",
        modified: "Feb 15, 2026",
        type: "sheet",
        content:
          "<p><strong>Campaign ROI Analysis</strong></p>\n<p>Overall ROI is 3.4x with paid social delivering the highest return. Creator-led ads contributed 58% of conversions.</p>\n<p>Recommendations: shift 10% of spend to high-performing creators and expand retargeting windows.</p>",
      },
    ],
  },
  {
    id: "my-docs",
    name: "My Docs",
    section: "local",
    files: [
      {
        id: "meeting-notes",
        name: "Meeting Notes.doc",
        modified: "Feb 7, 2026",
        type: "doc",
        content:
          "<p><strong>Meeting Notes</strong></p>\n<p>Discussed Q2 roadmap and prioritization. Key focus areas: AI Assist improvements, mobile editor, and partner integrations.</p>\n<p>Action items: draft new onboarding flow and align on success metrics by next week.</p>",
      },
      {
        id: "quick-ideas",
        name: "Quick Ideas.doc",
        modified: "Feb 6, 2026",
        type: "doc",
        content:
          "<p><strong>Brainstorm Notes</strong></p>\n<ul>\n<li>Auto-generate creator invoices with Payper branding</li>\n<li>One-click portfolio pages</li>\n<li>Recurring sponsorship templates</li>\n</ul>",
      },
    ],
  },
  {
    id: "templates",
    name: "Templates",
    section: "local",
    files: [
      {
        id: "campaign-brief-template",
        name: "Campaign Brief Template.doc",
        modified: "Jan 12, 2026",
        type: "doc",
        content:
          "<p><strong>Campaign Brief Template</strong></p>\n<p>Objective:</p>\n<p>Target Audience:</p>\n<p>Key Message:</p>\n<p>Deliverables:</p>\n<p>Timeline:</p>",
      },
    ],
  },
  {
    id: "shared",
    name: "Shared",
    section: "local",
    files: [],
  },
];

const glassCard =
  "bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl";

export default function DocsPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [docContents, setDocContents] = useState(() => {
    const map: Record<string, string> = {};
    initialFolders.forEach((folder) => {
      folder.files.forEach((file) => {
        map[file.id] = file.content;
      });
    });
    return map;
  });
  const [docTitles, setDocTitles] = useState(() => {
    const map: Record<string, string> = {};
    initialFolders.forEach((folder) => {
      folder.files.forEach((file) => {
        map[file.id] = file.name;
      });
    });
    return map;
  });
  const [aiOpen, setAiOpen] = useState(false);

  const selectedDoc = useMemo(() => {
    if (!selectedFileId) return null;
    for (const folder of initialFolders) {
      const doc = folder.files.find((file) => file.id === selectedFileId);
      if (doc) return doc;
    }
    return null;
  }, [selectedFileId]);

  const googleFolders = initialFolders.filter((folder) => folder.section === "google");
  const localFolders = initialFolders.filter((folder) => folder.section === "local");

  const getFileIcon = (type: DocFile["type"]) => {
    if (type === "sheet") return <FileBarChart2 className="h-4 w-4 text-teal-300" />;
    if (type === "image") return <ImageIcon className="h-4 w-4 text-teal-300" />;
    return <FileText className="h-4 w-4 text-teal-300" />;
  };

  return (
    <div className="h-screen w-full bg-[#050708] text-white">
      <div className="flex h-full gap-6 px-8 py-6">
        <aside className={`w-[30%] ${glassCard} flex h-full flex-col overflow-hidden`}>
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <Cloud className="h-5 w-5 text-[#00d4aa]" />
            </div>
            <div>
              <p className="text-sm text-white/60">Payper Cloud</p>
              <h2 className="text-lg font-semibold">Documents</h2>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-4">
            <div className="h-full overflow-y-auto pr-2">
              <Section
                title="Google Drive"
                subtitle="Connected"
                folders={googleFolders}
                selectedFolder={selectedFolder}
                onFolderSelect={setSelectedFolder}
                selectedFileId={selectedFileId}
                onFileSelect={(id) => {
                  setSelectedFileId(id);
                  setAiOpen(false);
                }}
                getFileIcon={getFileIcon}
              />

              <Section
                title="Local Documents"
                subtitle="Stored in Payper Cloud"
                folders={localFolders}
                selectedFolder={selectedFolder}
                onFolderSelect={setSelectedFolder}
                selectedFileId={selectedFileId}
                onFileSelect={(id) => {
                  setSelectedFileId(id);
                  setAiOpen(false);
                }}
                getFileIcon={getFileIcon}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-white/[0.06] px-6 py-5">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:border-[#00d4aa]/60 hover:text-white">
              <Plus className="h-4 w-4" /> New Folder
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#00c19a]">
              <Upload className="h-4 w-4" /> Upload File
            </button>
          </div>
        </aside>

        <main className={`w-[70%] ${glassCard} h-full overflow-hidden`}>
          {!selectedDoc ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Select a document or create a new one</p>
                <p className="mt-2 text-sm text-white/50">Your files will appear here in a distraction-free editor.</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <input
                  value={docTitles[selectedDoc.id] || selectedDoc.name}
                  onChange={(event) =>
                    setDocTitles((prev) => ({
                      ...prev,
                      [selectedDoc.id]: event.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-6 py-3">
                <ToolbarButton label="Bold" icon={<Bold className="h-4 w-4" />} />
                <ToolbarButton label="Italic" icon={<Italic className="h-4 w-4" />} />
                <ToolbarButton label="Underline" icon={<Underline className="h-4 w-4" />} />
                <ToolbarButton label="H1" icon={<Heading1 className="h-4 w-4" />} />
                <ToolbarButton label="H2" icon={<Heading2 className="h-4 w-4" />} />
                <ToolbarButton label="Bullets" icon={<List className="h-4 w-4" />} />
                <ToolbarButton label="Link" icon={<LinkIcon className="h-4 w-4" />} />

                <div className="relative ml-auto">
                  <button
                    onClick={() => setAiOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-xl bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(0,212,170,0.2)]"
                  >
                    <Sparkles className="h-4 w-4" /> AI Assist
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {aiOpen && (
                    <div className="absolute right-0 mt-3 w-52 rounded-xl border border-white/[0.08] bg-white/[0.06] p-2 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                      {[
                        "Summarize",
                        "Improve writing",
                        "Translate",
                        "Generate outline",
                      ].map((item) => (
                        <button
                          key={item}
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden px-6 py-5">
                <div
                  className="h-full overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm leading-relaxed text-white/90"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) =>
                    setDocContents((prev) => ({
                      ...prev,
                      [selectedDoc.id]: (event.target as HTMLDivElement).innerHTML,
                    }))
                  }
                  dangerouslySetInnerHTML={{
                    __html: docContents[selectedDoc.id] || selectedDoc.content,
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  folders,
  selectedFolder,
  onFolderSelect,
  selectedFileId,
  onFileSelect,
  getFileIcon,
}: {
  title: string;
  subtitle: string;
  folders: FolderNode[];
  selectedFolder: string | null;
  onFolderSelect: (id: string | null) => void;
  selectedFileId: string | null;
  onFileSelect: (id: string) => void;
  getFileIcon: (type: DocFile["type"]) => React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="px-2">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">{title}</p>
        <p className="mt-1 text-xs text-white/50">{subtitle}</p>
      </div>

      <div className="mt-3 space-y-2">
        {folders.map((folder) => {
          const isOpen = selectedFolder === folder.id;
          return (
            <div key={folder.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <button
                onClick={() => onFolderSelect(isOpen ? null : folder.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <FolderOpen className="h-4 w-4 text-[#00d4aa]" />
                  ) : (
                    <Folder className="h-4 w-4 text-white/70" />
                  )}
                  <span className="text-sm font-medium text-white/90">{folder.name}</span>
                </div>
                <span className="text-xs text-white/50">{folder.files.length} files</span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-white/[0.06] px-3 py-3">
                  {folder.files.length === 0 ? (
                    <p className="text-xs text-white/40">No documents yet.</p>
                  ) : (
                    folder.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => onFileSelect(file.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition ${
                          selectedFileId === file.id
                            ? "bg-white/[0.08] text-white"
                            : "text-white/70 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type)}
                          <span className="text-xs font-medium">{file.name}</span>
                        </div>
                        <span className="text-[10px] text-white/40">{file.modified}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolbarButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/80 transition hover:border-[#00d4aa]/60 hover:text-white"
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
