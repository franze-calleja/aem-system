"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_SEMESTER,
  type Semester,
  type TeacherClassInput,
  useTeacherClasses,
} from "@/components/roles/teacher/teacher-class-store";

const emptyDraft: TeacherClassInput = {
  name: "",
  schoolYear: DEFAULT_SCHOOL_YEAR,
  semester: DEFAULT_SEMESTER,
  gradeLevel: "",
  section: "",
  subject: "",
  adviser: "",
  schedule: "",
};

const semesterOptions: Semester[] = ["1st Semester", "2nd Semester", "Summer"];
type SemesterFilter = Semester | "All";

export default function MyClasses() {
  const router = useRouter();
  const { classes, addClass, updateClass, deleteClass } = useTeacherClasses();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TeacherClassInput>(emptyDraft);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(DEFAULT_SCHOOL_YEAR);
  const [selectedSemester, setSelectedSemester] = useState<SemesterFilter>("All");

  const title = editingId ? "Edit Class" : "Add Class";
  const availableSchoolYears = useMemo(
    () => Array.from(new Set([DEFAULT_SCHOOL_YEAR, ...classes.map((item) => item.schoolYear)])).sort().reverse(),
    [classes],
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter(
        (item) =>
          item.schoolYear === selectedSchoolYear &&
          (selectedSemester === "All" ? true : item.semester === selectedSemester),
      ),
    [classes, selectedSchoolYear, selectedSemester],
  );

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsOpen(true);
  };

  const openEdit = (classId: string) => {
    const current = classes.find((item) => item.id === classId);
    if (!current) return;

    setEditingId(classId);
    setDraft({
      name: current.name,
      schoolYear: current.schoolYear,
      semester: current.semester,
      gradeLevel: current.gradeLevel,
      section: current.section,
      subject: current.subject,
      adviser: current.adviser,
      schedule: current.schedule,
    });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const submitClass = () => {
    if (!draft.name.trim() || !draft.gradeLevel.trim() || !draft.section.trim()) {
      return;
    }

    if (editingId) {
      updateClass(editingId, draft);
    } else {
      addClass(draft);
    }

    closeModal();
  };

  const cardStats = useMemo(
    () => filteredClasses.map((item) => ({ id: item.id, students: item.students.length })),
    [filteredClasses],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">My Classes</h2>
          <p className="mt-1 text-sm text-slate-500">Open a class to view the student roster, attendance flow, and gradebook.</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Add Class
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="block font-medium">School year</span>
          <select
            value={selectedSchoolYear}
            onChange={(event) => setSelectedSchoolYear(event.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {availableSchoolYears.map((schoolYear) => (
              <option key={schoolYear} value={schoolYear}>
                {schoolYear}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          <span className="block font-medium">Semester</span>
          <select
            value={selectedSemester}
            onChange={(event) => setSelectedSemester(event.target.value as SemesterFilter)}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="All">All Semesters</option>
            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <p>
          Showing {filteredClasses.length} class{filteredClasses.length === 1 ? "" : "es"} for {selectedSchoolYear}
          {selectedSemester === "All" ? "" : ` · ${selectedSemester}`}
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedSchoolYear(DEFAULT_SCHOOL_YEAR);
            setSelectedSemester("All");
          }}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Reset filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClasses.map((item, index) => {
          const stats = cardStats.find((stat) => stat.id === item.id);

          return (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Class {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.gradeLevel} · {item.section}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {stats?.students ?? 0} students
                  </span>
                  <span className="rounded-full border border-slate-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    {item.semester}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div><span className="font-medium text-slate-700">School year:</span> {item.schoolYear}</div>
                <div><span className="font-medium text-slate-700">Subject:</span> {item.subject}</div>
                <div><span className="font-medium text-slate-700">Adviser:</span> {item.adviser}</div>
                <div><span className="font-medium text-slate-700">Schedule:</span> {item.schedule}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/teacher/my-classes/${item.id}`)}
                  className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  View Students
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item.id)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete ${item.name}?`)) {
                      deleteClass(item.id);
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">Update the class details shown on the cards and roster pages.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-600">
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Class name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
              <Field label="School year" value={draft.schoolYear} onChange={(value) => setDraft((current) => ({ ...current, schoolYear: value }))} />
              <FieldSelect label="Semester" value={draft.semester} onChange={(value) => setDraft((current) => ({ ...current, semester: value }))} options={semesterOptions} />
              <Field label="Grade level" value={draft.gradeLevel} onChange={(value) => setDraft((current) => ({ ...current, gradeLevel: value }))} />
              <Field label="Section" value={draft.section} onChange={(value) => setDraft((current) => ({ ...current, section: value }))} />
              <Field label="Subject" value={draft.subject} onChange={(value) => setDraft((current) => ({ ...current, subject: value }))} />
              <Field label="Adviser" value={draft.adviser} onChange={(value) => setDraft((current) => ({ ...current, adviser: value }))} />
              <Field label="Schedule" value={draft.schedule} onChange={(value) => setDraft((current) => ({ ...current, schedule: value }))} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={submitClass} className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                {editingId ? "Save Changes" : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: Semester;
  onChange: (value: Semester) => void;
  options: Semester[];
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Semester)}
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
