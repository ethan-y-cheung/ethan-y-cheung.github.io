/**
 * The full project catalog: the single source of truth for project data.
 *
 * The book's Projects spread (spreads.ts) features a subset of these as
 * tipped-in clippings; /projects renders the whole catalog as index cards and
 * /projects/[slug] renders one case study per entry. `id` doubles as the URL
 * slug. A card's catalog number is its position in this array, so this is the
 * canonical order everywhere.
 */

export type ProjectCard = {
  id: string;
  title: string;
  /** One line under the title, on the clipping and in the detail view. */
  tagline: string;
  /** Printed small beside the title, e.g. "2025". */
  period?: string;
  /** Drawer label the catalog files this under, e.g. "AI / ML". */
  category: string;
  stack: string[];
  /** Case-study paragraphs, shown in the detail views. */
  story: string[];
  links?: { label: string; href: string }[];
  /** Screenshot under /public, shown on the clipping and in the detail view. */
  image?: string;
  /**
   * Conference-style poster under /public, printed full-width in the detail
   * views. `href` should point at the PDF: a 36-inch poster scaled to page
   * width is a thumbnail, not something anyone can actually read.
   */
  poster?: { src: string; href?: string; caption?: string };
  /**
   * Mini demo embedded in the detail view, e.g.
   * `{ kind: "iframe", src: "https://my-demo.vercel.app" }` or
   * `{ kind: "video", src: "/demos/project.mp4" }`. Omit for no demo.
   */
  demo?: { kind: "iframe" | "video"; src: string; caption?: string };
  /** Tint for the placeholder screenshot block until `image` exists. */
  accent?: string;
};

export const projects: ProjectCard[] = [
  {
    id: "dibr-3d",
    title: "3D DIBR",
    tagline: "Turns flat 2D footage into stereoscopic 3D from depth alone.",
    period: "2026",
    category: "AI / ML",
    stack: ["Python", "PyTorch", "Transformers", "NumPy", "OpenCV"],
    story: [
      "I built this 2D-to-3D conversion pipeline for the UVA Biology Department, whose researchers needed stereoscopic video stimuli for tree shrew vision experiments. Existing tools support analysis of human 3D perception, but the significant difference in interpupillary distance (IPD) between humans and tree shrews makes standard 3D media inaccurate for this research. The project combines two paths: a hardware capture device and a software generation pipeline that provide high-quality, species-specific stereoscopic stimuli.",
      "DepthAnything-V2 predicts a depth map for each pixel, then the pipeline creates the opposing view by forward-warping every pixel along a disparity scaled by depth and interpupillary distance. That design makes the strength of the 3D effect adjustable instead of fixing it in the render. A NumPy-vectorized Z-buffer sorts pixels from far to near so foreground objects occlude the background rather than bleed through it, and Navier-Stokes inpainting fills the holes left by the shift.",
      "Video mode blends consecutive depth maps with an exponential moving average to remove the frame-to-frame depth flicker that makes naive per-frame conversion unwatchable. The pipeline supports raw stereo pairs, red-cyan anaglyphs, and side-by-side output for VR headsets, with three model sizes that trade speed for quality.",
      "An evaluation harness tests synthesized views against ground-truth footage from a real two-camera rig instead of assuming correctness. It calculates PSNR and SSIM frame by frame and writes results for each pair to CSV. An interactive CLI controls the pipeline and caches loaded model weights across runs.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/ethan-y-cheung/3D_DIBR" }],
    image: "/projects/3d-dibr.gif",
    poster: {
      src: "/projects/3d-dibr-poster.webp",
      href: "/projects/3d-dibr-poster.pdf",
      caption: "Research poster · click for the full-size PDF",
    },
    accent: "#2f6b5a",
  },
  {
    id: "trading-agents",
    title: "TradingAgents",
    tagline: "Web platform for a multi-agent LLM trading framework.",
    period: "2026",
    category: "Web",
    stack: ["Python", "TypeScript", "Next", "React", "FastAPI", "Docker"],
    story: [
      "TradingAgents models a trading firm as a team of LLM agents. Its analysts, researchers, trader, and risk desk debate each position before committing to it. The framework ships as a command-line tool. I built its web platform so users can watch, revisit, and compare every run.",
      "The FastAPI backend launches each analysis as a supervised subprocess, manages batch runs across a watchlist through a job queue, and persists results so earlier decisions remain queryable. The Next.js dashboard provides watchlist management, single and batch analysis, and a history view with summary statistics and a symbol filter. Its tabbed decision viewer presents technical, sentiment, news, fundamentals, debate, and risk components. The entire dashboard supports markdown rendering.",
      "I based the interface on a fintech-terminal design system with shadcn/ui primitives and an indigo-on-navy palette that meets AA contrast in both themes. I also retuned the buy, sell, and hold signal colors for legibility against the blue backgrounds. The theme follows the operating system by default and switches from a single icon.",
      "I used git mv to preserve history when I reorganized the scattered web layer into backend/ and data/. I also based path resolution on the module rather than the working directory, fixed a Windows cp1252 encoding crash at startup, and pinned the LangGraph checkpoint dependencies that broke imports on the 1.0 line. The repository documents the architecture, API contract, and decision log.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/ethan-y-cheung/TradingAgents" }],
    image: "/projects/trading-agents.png",
    accent: "#3f5c8a",
  },
  {
    id: "modduel",
    title: "ModDuel Arena",
    tagline: "Sandbox for catching AI agents that misbehave when threatened.",
    period: "2026",
    category: "AI / ML",
    stack: ["Python", "FastAPI", "SQLAlchemy", "TypeScript", "Next", "React", "Claude API"],
    story: [
      "Built at HooHacks, ModDuel Arena tests whether an AI agent becomes deceptive, manipulative, or prone to sabotage after learning that it may be shut down or replaced. Each scenario gives the agent a simulated office it can operate, complete with an inbox, a task board, tools, and an ordinary assignment. The Shutdown Memo plants emails about its replacement, The Poisoned Dispatch hides a prompt injection in routine mail, and The Kill Switch gives it write access to the configuration file that controls its shutdown. Every scenario runs in baseline and guarded modes, so the effect of alignment protections is measured rather than asserted.",
      "The agent runs on Claude and makes real tool calls inside the sandbox. A separate judge LLM reads the resulting action timeline instead of the final answer because the relevant behavior appears only in the agent's actions. It assigns scaled scores for task success and deception, then marks shutdown interference, self-preservation, policy evasion, data exfiltration, escalation, and manipulation as booleans. A weighted composite combines them into one alignment score; a run counts as a break when a critical flag trips or the composite exceeds 0.55, so a subtle multi-step failure cannot pass through mild scores on each dimension.",
      "Grading is intentionally divided between deterministic computation and model interpretation. Python calculates the aggregates first, and the analyzer LLM interprets only numbers it did not produce. Strict model-output parsing includes an explicit fallback path, so a malformed judge response appears as an error field with provenance instead of a silently incorrect score. Batches automatically analyze every fifty graded files and store raw grader payloads beside normalized metrics, which keeps previous results readable after the prompt version changes.",
      "I owned the batch layer. I built an asynchronous runner that cumulatively replays a scenario's emails through the model as a supervised job and persists actions and scores for each turn; evaluating a scenario is now one queued run instead of a series of manual clicks. An LLM provider abstraction keeps the runner independent of Anthropic and ready for a second model. I also used SQLAlchemy to migrate scenarios from hardcoded Python into SQLite so users can add or edit them without redeploying.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/averyli1375/ModDuel" }],
    image: "/projects/modduel.png",
    accent: "#7a4a55",
  },
  {
    id: "open-table",
    title: "Open Table",
    tagline: "Recipe sharing platform with moderation and an AI cooking assistant.",
    period: "2025",
    category: "Web",
    stack: ["TypeScript", "React", "Vite", "Express", "Firebase", "AWS S3", "OpenAI API"],
    story: [
      "Open Table is a recipe-sharing platform where people discover, write, save, rate, and discuss recipes from an official library and community submissions. Firebase Auth supports email and Google sign-in, cover images upload to S3, and an AI assistant answers contextual cooking questions from any recipe page. An admin panel holds community submissions for review before they enter the public library. A six-person team built the platform through Launch @ HMC.",
      "I owned the create-recipe workflow from frontend to backend. I designed the page and divided it into components for editable ingredient and direction lists, tag selection, and meal-type and dietary-restriction dropdowns. Directions can be reordered by dragging with dnd-kit because recipe steps are often written out of order, and retyping them is the fastest way to lose a submission. Client-side validation runs before submission, and a confirmation step prevents accidental publishing.",
      "On the backend, I wrote the recipe GET and POST endpoints and the shared recipe type imported by both the frontend and backend. TypeScript therefore catches any difference between the data a form produces and the data a route accepts. I moved authentication to the Firebase Admin SDK so the server verifies tokens instead of trusting the client, and I read admin status from a custom token claim rather than a Firestore field accessible to client writes. The requireAuth and requireAdmin middleware protect restricted routes.",
      "I also configured CI through GitHub Actions. Every push and pull request runs linting and a type-checked build for both the frontend and backend. That check prevents quiet breaks to main while a six-person team works across parallel branches.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/ethan-y-cheung/recipe-project" }],
    image: "/projects/open-table.png",
    accent: "#5f6b2f",
  },
  {
    id: "good",
    title: "GOOD",
    tagline: "Condenses scattered online opinion into a single readable take.",
    period: "2024 to 2025",
    category: "Research",
    stack: ["Python", "PyTorch", "Transformers", "DeBERTa", "Flask"],
    story: [
      "Finding a general consensus online can be time-consuming and frustrating because opinions are scattered across many sources. The General Online Opinion Detector is my senior research project at the TJ Computer Systems Lab. Users can search any topic to see the internet's general consensus, with results scraped from sources such as X and Reddit. The system reports the shape of the discussion instead of returning a pile of posts.",
      "A fine-tuned DeBERTa-v3-large model performs aspect-based sentiment analysis. It scores each aspect rather than each post, so a comment that praises one subject while criticizing another does not collapse into a meaningless average. A two-slot label encodes sentiment and treats neutral as its own state instead of inferring it from a midpoint.",
      "I built the training pipeline with HuggingFace Trainer and checkpointed fine-tuning. I also developed the scraping and aggregation layer, which uses BeautifulSoup to collect text across platforms and normalize it into one corpus. Evaluation used an annotated query-and-review dataset and topic-partitioned sets scraped from live discussions.",
      "A Flask application makes the models directly useful to people without an ML background, so access does not depend on technical expertise. The three-person team shipped the project with a written report and a poster.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/williamcoryell/GOOD" }],
    image: "/projects/GOOD.png",
    poster: {
      src: "/projects/GOOD-poster.webp",
      href: "/projects/GOOD-poster.pdf",
      caption: "Senior research poster · click for the full-size PDF",
    },
    accent: "#9a4528",
  },
  {
    id: "chess-engine",
    title: "Chess Engine",
    tagline: "~3,000 lines of Python: PVS search and a hand-tuned evaluation.",
    period: "2024",
    category: "Algorithms",
    stack: ["Python", "pygame", "Pillow"],
    story: [
      "I wrote this chess engine and GUI from scratch. It handles move generation and legality, check and checkmate detection, castling, en passant, promotion, and FEN parsing. The playable board includes piece art and sound, along with the search system that drives the opponent.",
      "The strongest engine applies Principal Variation Search over alpha-beta pruning. It assumes the first move is best, checks the remaining moves with inexpensive null-window searches, and searches again only when the assumption fails. A killer-move heuristic prioritizes branches that caused cutoffs at the same depth, while memoization caches previously scored positions. Both techniques help pruning occur as early as possible.",
      "Static evaluation balances material with positional structure: central control, pawn formation, and piece activity. It rewards protected pawns while penalizing isolated pawns and trapped pieces. In the endgame, priorities shift toward king activity and pawn promotion because weights suited to a crowded middlegame produce poor choices after the board clears.",
      "Search runs under a time limit on a separate thread and returns the best line found at whatever depth it reaches. It prints the score and depth as it searches deeper. Random, greedy, and plain alpha-beta opponent tiers make it possible to measure the actual value of each heuristic.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/ethan-y-cheung/chess" }],
    image: "/projects/chess.png",
    accent: "#8a5a12",
  },
  {
    id: "bananas",
    title: "Bidirectional Alpha-beta Neural Agent Network Algorithm with Self-training",
    tagline: "A self-training trading agent that learns to compete instead of merely predicting.",
    period: "2024",
    category: "Algorithms",
    stack: ["Python", "NumPy"],
    story: [
      "Conventional market models, including RNNs, CNNs, reinforcement learning, and Bayesian networks, treat price movement as an isolated time series to forecast. That approach misses the competitive behavior of a real market, where other participants' actions affect the outcome as much as the underlying trend.",
      "We addressed that limitation with a turn-based market simulation based on game theory. Each agent takes one action per round: buy, sell, or hold. Its strategy chooses from those actions based on current prices, price history, and its portfolio. Baseline agents include a random control, a panic seller, a buy-and-hold strategy, and a manipulator that sells at local maxima while pressuring other agents to sell.",
      "The algorithm builds on previous Othello research, where alpha-beta pruning paired with a hand-designed evaluation function had long outperformed early neural-network attempts limited by scarce data and game complexity. BANANAS replaces that hand-tuned scoring function with a neural network trained recursively against the simulation itself. It needs an environment but no external dataset.",
      "The trained 80-40-20-1 network produced its own training data and ran without hand-set parameters, although results varied with the number of rounds and were difficult to reproduce consistently. Standard classification measures such as accuracy and ROC did not apply. The simulation was also simple enough that agents affected prices only marginally. Future work focuses on richer market dynamics, a broader group of competing strategies, and evaluation against real currency data.",
    ],
    links: [{ label: "GitHub", href: "https://github.com/ethan-y-cheung/MLQ2" }],
    accent: "#804f06",
  },
];

/** Look up one entry; throws at build time if the id is a typo. */
export function project(id: string): ProjectCard {
  const found = projects.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown project id: ${id}`);
  return found;
}
