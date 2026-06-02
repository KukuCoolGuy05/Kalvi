/**
 * courses.ts — the course/topic catalog.
 *
 * A "course" is a (subject, topic) pair the learner can jump into. `subject` is
 * the umbrella the agent teaches and tracks mastery against (e.g. "Algebra");
 * `topic` is the specific starting point shown in the UI (e.g. "Algebra
 * Basics"). Categories group courses for the "Explore popular topics" tab.
 *
 * This is intentionally plain data (no DB) so the picker is instant and works
 * offline. Swap to a DB/RAG-backed catalog later without touching the UI.
 */

export interface Course {
  id: string;
  /** Umbrella subject used for the system prompt + mastery tracking. */
  subject: string;
  /** Specific course/topic title shown to the learner. */
  topic: string;
  /** One-line description. */
  blurb: string;
  /** Category id (see COURSE_CATEGORIES). */
  category: string;
}

export interface CourseCategory {
  id: string;
  label: string;
  /** Accent color (Tailwind class) for the category chip. */
  accent: string;
}

export const COURSE_CATEGORIES: CourseCategory[] = [
  { id: "math", label: "Mathematics", accent: "bg-blue-500" },
  { id: "science", label: "Science", accent: "bg-emerald-500" },
  { id: "english", label: "English & Writing", accent: "bg-violet-500" },
  { id: "history", label: "History & Social Studies", accent: "bg-amber-500" },
  { id: "cs", label: "Computer Science", accent: "bg-rose-500" },
  { id: "languages", label: "Languages", accent: "bg-cyan-500" },
];

export const COURSES: Course[] = [
  // --- Mathematics ---
  { id: "pre-algebra", subject: "Pre-Algebra", topic: "Pre-Algebra Foundations", blurb: "Fractions, ratios, and the building blocks before algebra.", category: "math" },
  { id: "algebra", subject: "Algebra", topic: "Algebra Basics", blurb: "Variables, equations, and solving for x.", category: "math" },
  { id: "geometry", subject: "Geometry", topic: "Geometry Fundamentals", blurb: "Shapes, angles, area, and proofs.", category: "math" },
  { id: "trigonometry", subject: "Trigonometry", topic: "Intro to Trigonometry", blurb: "Sine, cosine, tangent, and the unit circle.", category: "math" },
  { id: "calculus", subject: "Calculus", topic: "Intro to Calculus", blurb: "Limits, derivatives, and rates of change.", category: "math" },
  { id: "statistics", subject: "Statistics", topic: "Statistics & Probability", blurb: "Averages, distributions, and reading data.", category: "math" },

  // --- Science ---
  { id: "biology", subject: "Biology", topic: "Biology Basics", blurb: "Cells, DNA, and how living things work.", category: "science" },
  { id: "chemistry", subject: "Chemistry", topic: "Intro to Chemistry", blurb: "Atoms, the periodic table, and reactions.", category: "science" },
  { id: "physics", subject: "Physics", topic: "Physics Fundamentals", blurb: "Motion, forces, energy, and electricity.", category: "science" },
  { id: "earth-science", subject: "Earth Science", topic: "Earth & Weather", blurb: "Rocks, climate, oceans, and the water cycle.", category: "science" },
  { id: "astronomy", subject: "Astronomy", topic: "Exploring the Universe", blurb: "Planets, stars, galaxies, and space.", category: "science" },

  // --- English & Writing ---
  { id: "grammar", subject: "Grammar", topic: "Grammar Essentials", blurb: "Parts of speech, punctuation, and sentence structure.", category: "english" },
  { id: "essay-writing", subject: "Essay Writing", topic: "Writing Strong Essays", blurb: "Thesis, structure, and persuasive writing.", category: "english" },
  { id: "reading", subject: "Reading Comprehension", topic: "Reading Comprehension", blurb: "Understand, summarize, and analyze texts.", category: "english" },
  { id: "vocabulary", subject: "Vocabulary", topic: "Building Vocabulary", blurb: "Grow your word power with roots and context.", category: "english" },
  { id: "creative-writing", subject: "Creative Writing", topic: "Creative Writing", blurb: "Stories, characters, and finding your voice.", category: "english" },

  // --- History & Social Studies ---
  { id: "world-history", subject: "World History", topic: "World History Overview", blurb: "Ancient civilizations to the modern world.", category: "history" },
  { id: "us-history", subject: "US History", topic: "US History Overview", blurb: "Founding, growth, and key turning points.", category: "history" },
  { id: "geography", subject: "Geography", topic: "World Geography", blurb: "Countries, capitals, maps, and landforms.", category: "history" },
  { id: "civics", subject: "Civics", topic: "Government & Civics", blurb: "How government, rights, and voting work.", category: "history" },

  // --- Computer Science ---
  { id: "intro-programming", subject: "Programming", topic: "Intro to Programming", blurb: "Think like a coder: logic, loops, and variables.", category: "cs" },
  { id: "python", subject: "Python", topic: "Python for Beginners", blurb: "Write your first real programs in Python.", category: "cs" },
  { id: "web-dev", subject: "Web Development", topic: "How Websites Work", blurb: "HTML, CSS, and the basics of the web.", category: "cs" },
  { id: "how-internet-works", subject: "How the Internet Works", topic: "How the Internet Works", blurb: "Servers, browsers, and what happens when you click.", category: "cs" },

  // --- Languages ---
  { id: "spanish", subject: "Spanish", topic: "Spanish for Beginners", blurb: "Greetings, everyday words, and simple sentences.", category: "languages" },
  { id: "french", subject: "French", topic: "French for Beginners", blurb: "Start speaking French from day one.", category: "languages" },
  { id: "esl", subject: "English (ESL)", topic: "English as a Second Language", blurb: "Build everyday English speaking and reading.", category: "languages" },
];

/** Case-insensitive search across subject, topic, blurb, and category label. */
export function searchCourses(query: string): Course[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const catLabel = (id: string) =>
    COURSE_CATEGORIES.find((c) => c.id === id)?.label.toLowerCase() ?? "";
  return COURSES.filter((c) =>
    [c.subject, c.topic, c.blurb, catLabel(c.category)]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

/**
 * Suggest courses based on the subjects the learner mentioned during
 * onboarding. We match each profile subject against the catalog (substring,
 * both directions) so "math" surfaces Algebra/Geometry/etc. If nothing matches,
 * fall back to a curated set of popular starters so the list is never empty.
 */
export function suggestCourses(profileSubjects: string[], limit = 6): Course[] {
  const terms = profileSubjects.map((s) => s.toLowerCase().trim()).filter(Boolean);

  if (terms.length > 0) {
    const matches = COURSES.filter((c) => {
      const hay = `${c.subject} ${c.topic} ${c.blurb} ${c.category}`.toLowerCase();
      return terms.some((t) => hay.includes(t) || t.includes(c.subject.toLowerCase()));
    });
    if (matches.length > 0) return matches.slice(0, limit);
  }

  // Fallback: a friendly cross-section of popular starters.
  const popularIds = ["algebra", "biology", "essay-writing", "python", "spanish", "world-history"];
  return popularIds
    .map((id) => COURSES.find((c) => c.id === id))
    .filter((c): c is Course => Boolean(c))
    .slice(0, limit);
}

export function coursesByCategory(categoryId: string): Course[] {
  return COURSES.filter((c) => c.category === categoryId);
}
