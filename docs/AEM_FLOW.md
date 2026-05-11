

## 1. Global Architectural Requirements
Before building specific pages, ensure these three global elements are in place:
* **The Year Switcher:** A prominent dropdown in the navigation bar. Since the system separates persistent identity from per-year records, the user must always know if they are looking at "SY 2024–2025" or "SY 2025–2026."
* **Role-Based Navigation:** The sidebar/menu must change dynamically based on the logged-in role (Admin, Teacher, Counselor, Principal).
* **Explainability Tooltips:** Throughout the app, any "Risk Score" or "Pattern" must have an info icon that, when clicked, shows the "why" behind the number.

---

## 2. Page & Feature Map by Role

### **A. Admin (The System Governor)**
*Focus: Data integrity and system setup.*
1.  **Dashboard:** System health, user counts, and active school year status.
2.  **User Management:** Tables to create/suspend users and assign **Section Advisers**.
3.  **Import Wizard (Critical):** A step-by-step flow (Stepper UI) for CSV uploads: Roster $\rightarrow$ Grades $\rightarrow$ Attendance $\rightarrow$ Behavior $\rightarrow$ Interventions.
4.  **Algorithm Config:** A "Settings" page where admins can adjust the weights (e.g., changing Academic weight from 30% to 25%).
5.  **Audit Log:** A searchable table showing every sensitive action taken in the system.

### **B. Teacher (The Data Provider)**
*Focus: Speed and classroom management.*
1.  **My Classes:** A grid of assigned sections.
2.  **Attendance Sheet:** A keyboard-friendly table (TAB to move, keys for P/A/T/E) for daily logging.
3.  **Gradebook:** Simple inputs for quarterly grades and pre/post-test scores.
4.  **Student Risk Panel:** Inside each class view, a list of students with "Risk Badges" (Low/Med/High).
5.  **Intervention Feedback:** A "Public View" of active interventions where they can click **"Log Session"** or **"Submit Observation."**

### **C. Counselor (The Clinical Lead)**
*Focus: Deep analysis and intervention planning.*
1.  **Caseload Dashboard:** A "Urgent Attention" list of students sorted by risk score.
2.  **Full Student Profile:** A complex page showing:
    * **Academic Trends:** Line charts of grades.
    * **Attendance Heatmaps:** To show "Day-of-Week" effects.
    * **Private Counseling Notes:** A text editor visible only to counselors.
3.  **Intervention Builder:**
    * **Recommendation Queue:** AI-generated drafts from Gemini.
    * **Plan Creator:** Form with "Public" (schedule) and "Sensitive" (rationale) fields.
4.  **Feedback Queue:** A "Review" center to see notes/requests sent by Teachers.

### **D. Principal (The Oversight)**
*Focus: High-level trends and approvals.*
1.  **School-wide Dashboard:** Large charts showing risk distribution by Grade Level and Sex.
2.  **Bias Monitoring:** A specialized dashboard comparing risk across demographics (e.g., SPED vs. non-SPED).
3.  **Approval Center:** A list of "Pending" section-wide or school-wide interventions that need their signature.
4.  **Override Interface:** The ability to manually change a student's risk band with a mandatory "Justification" text box.

---

## 3. Core User Flows to Design

### **Flow 1: Data to Decision (Counselor)**
1.  Counselor gets a **Notification** (Pattern Match: "Academic Decline Cluster").
2.  Opens **Student Profile** $\rightarrow$ views **Explainability Panel**.
3.  Clicks **"Generate Draft"** (Gemini renders a recommendation).
4.  Edits and **Saves** as a "Planned Intervention."

### **Flow 2: The Feedback Loop (Teacher & Counselor)**
1.  Teacher logs a **Session** for an active intervention.
2.  Teacher submits a **Revision Request** ("Time conflict on Tuesdays").
3.  Counselor receives notification $\rightarrow$ **Updates Plan** $\rightarrow$ System logs an **InterventionRevision**.

---

## 4. Design Guidelines for "AI Literacy"
Since this is a research project on AI Literacy, your frontend must **never** just show a result without showing the work:
* **Don't say:** "Student is High Risk."
* **Do say:** "Student is High Risk ($72\%$) because of a $40\%$ drop in Math grades and $3$ consecutive absences."
* **Interactive Simulator:** Build a "What-If" page where users can toggle dummy data (e.g., "What if this student attends 5 more days?") to see the score change in real-time.

---
