/**
 * Content for the book spreads shown on the home page.
 *
 * Each spread is one open two-page layout: `left` and `right` map to the
 * physical pages of the book. Keep the copy short — a spread only has room for
 * roughly 60 words per page before it stops looking like a book page.
 *
 */

export type SkillGroup = {
  category: string;
  /** Icon glyph key rendered by PageContent's CategoryIcon. */
  icon: "code" | "layers" | "cloud" | "wrench" | "cpu";
  /** Print-friendly hex; tints the chips and colors the category label. */
  color: string;
  items: string[];
};

export type TimelineEntry = {
  /** Printed small above the entry, e.g. "2025 — present". */
  period: string;
  role: string;
  org: string;
  detail?: string;
};

// Project data lives in projects.ts (the full catalog); the book's Projects
// spread features a subset of it below. Re-exported so page components can
// keep importing the card type from here.
import { project } from "./projects";
import type { ProjectCard } from "./projects";
export type { ProjectCard };

export type SpreadPage = {
  heading?: string;
  /** Wrap words in ==double equals== to print them with a highlighter tint. */
  paragraphs?: string[];
  items?: { label: string; detail?: string; href?: string }[];
  skills?: SkillGroup[];
  /** Vertical timeline with a printed rule, for the experience spread. */
  timeline?: TimelineEntry[];
  /** Tipped-in project clippings; click to pick one up for the detail view. */
  projects?: ProjectCard[];
};

export type Spread = {
  id: string;
  /** Small label printed at the top of the spread, like a chapter title. */
  chapter: string;
  left: SpreadPage;
  right: SpreadPage;
};

/**
 * Type stamped on the closed front cover, visible while the book is shut at the
 * first beat. The 3D cover is a real surface facing the camera, so this needs no
 * projection tricks — it is DOM sitting on the cover.
 */
export const cover = {
  title: "Ethan Cheung",
  subtitle: "CS and Math Undergrad",
};

export const spreads: Spread[] = [
  {
    id: "about",
    chapter: "I. About",
    left: {
      heading: "Ethan Cheung",
      paragraphs: [
        "I'm a ==full-stack developer==, ==AI engineer==, and CS & Math undergrad at the ==University of Virginia==.",
        "I'm passionate about building ==NLP tools, ML models, web apps, and AI systems==. I actively seek new opportunities to apply my skills and learn from different environments, leading me to work on projects in ==education, finance, AI ethics, AI evaluations, physics, and biotech==. Throughout my work, I strive towards enabling automation, ensuring optimization, and developing ==scalable & robust solutions==.",
      ],
    },
    right: {
      heading: "Skills",
      skills: [
        {
          category: "Languages",
          icon: "code",
          color: "#8a5a12",
          items: ["TypeScript", "JavaScript", "Python", "Java", "C++", "Bash", "SQL", "HTML/CSS"],
        },
        {
          category: "Frameworks",
          icon: "layers",
          color: "#9a4528",
          items: [
            "React",
            "Node",
            "Next",
            "Fastify",
            "Express",
            "FastAPI",
            "Playwright",
            "Spring Boot",
          ],
        },
        {
          category: "Cloud & DB",
          icon: "cloud",
          color: "#2f6b5a",
          items: ["Supabase", "AWS", "Vercel", "Firebase", "Docker", "REST API"],
        },
        {
          category: "Tools",
          icon: "wrench",
          color: "#3f5c8a",
          items: ["Git", "Figma", "Jira", "Notion", "Cursor", "Claude Code", "Codex"],
        },
        {
          category: "AI & ML",
          icon: "cpu",
          color: "#6d4390",
          items: [
            "Gemini API",
            "OpenAI API",
            "PyTorch",
            "Transformers",
            "scikit-learn",
            "pandas",
            "NumPy",
            "DSPy",
            "pgvector",
            "BERT",
            "MCP",
            "Langfuse",
          ],
        },
      ],
    },
  },
  {
    id: "experience",
    chapter: "II. Experience",
    left: {
      heading: "Experience",
      timeline: [
        {
          period: "2026",
          role: "Software Engineering Intern",
          org: "Teaching Lab",
          detail:
            "Built an evals framework for a student AI game-creation pipeline; shipped v0 game templates that cut generation defects ~90%.",
        },
        {
          period: "2026 — present",
          role: "Machine Learning Researcher",
          org: "UVA Engineering Link Lab",
          detail:
            "LLM pipeline extracting structured flood-event records from Vietnamese news with GADM geo-resolution.",
        },
        {
          period: "2023 & 2024",
          role: "AI Integration & SWE Intern",
          org: "Armedia LLC",
          detail:
            "Trained a BERT relevance model (+0.21 MRR) and built an AI-assisted search engine migrated into ArkCase.",
        },
      ],
    },
    right: {
      heading: "Education",
      timeline: [
        {
          period: "2025 — present",
          role: "B.S. Computer Science & Mathematics",
          org: "University of Virginia",
          detail:
            "GPA 4.00. Courses include Software Development Essentials, Discrete Math, Data Structures & Algorithms, Probability, Differential Equations. Client project developer at ML@UVA, ICPC competitor, Web Dev at ACM@UVA.",
        },
        {
          period: "2021 — 2025",
          role: "Thomas Jefferson High School for Science & Technology",
          org: "Alexandria, VA",
          detail: 
            "GPA 4.52. Courses include Artificial Intelligence, Machine Learning, Multivariable Calculus, Linear Algebra.NLP research in the Computer Systems Lab.",
        },
      ],
    },
  },
  {
    id: "projects",
    chapter: "III. Projects",
    left: {
      heading: "Selected work",
      projects: [project("dibr-3d"), project("trading-agents")],
    },
    right: {
      projects: [project("good"), project("chess-engine")],
      items: [{ label: "All projects", detail: "Browse the full list.", href: "/projects" }],
    },
  },
];

export const contact = {
  kicker: "Epilogue",
  heading: "Thanks for viewing!",
  blurb: "Let's connect! I'm always open to new opportunities, collaborations, and conversations.",
  email: "ethan.y.cheung1@gmail.com",
};
