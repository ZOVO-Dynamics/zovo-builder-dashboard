import { ProjectBlueprint } from "./PromptAnalyzer";

export interface BuildBlueprint {
  name: string;
  folders: string[];
  files: string[];
  components: string[];
  routes: string[];
  dependencies: string[];
}

const FEATURE_MAP: Record<string, {
  components?: string[];
  routes?: string[];
  files?: string[];
  dependencies?: string[];
}> = {
  authentication: {
    components: ["LoginForm", "AuthProvider", "SignupForm"],
    routes: ["/login", "/signup"],
    files: ["src/lib/auth.ts"],
    dependencies: ["bcryptjs", "@types/bcryptjs"],
  },
  dashboard: {
    components: ["Dashboard", "DashboardStats"],
    routes: ["/dashboard"],
  },
  database: {
    files: ["src/lib/db.ts", "prisma/schema.prisma"],
    dependencies: ["prisma", "@prisma/client"],
  },
  api: {
    files: ["src/app/api/route.ts"],
  },
  crud: {
    components: ["ItemList", "ItemForm"],
    routes: ["/items"],
    files: ["src/app/api/items/route.ts"],
  },
  payments: {
    components: ["CheckoutForm", "PricingTable"],
    routes: ["/pricing", "/checkout"],
    files: ["src/lib/stripe.ts"],
    dependencies: ["stripe", "@stripe/stripe-js"],
  },
  notifications: {
    components: ["NotificationBell", "NotificationList"],
    files: ["src/lib/notifications.ts"],
  },
  search: {
    components: ["SearchBar", "SearchResults"],
    routes: ["/search"],
  },
  chat: {
    components: ["ChatWindow", "MessageList"],
    routes: ["/chat"],
    files: ["src/lib/chat.ts"],
  },
  admin: {
    components: ["AdminPanel", "UserTable"],
    routes: ["/admin"],
  },
  profile: {
    components: ["ProfileForm", "AvatarUpload"],
    routes: ["/profile"],
    dependencies: ["react-hook-form", "zod", "@hookform/resolvers"],
  },
  email: {
    files: ["src/lib/email.ts"],
    dependencies: ["resend"],
  },
  analytics: {
    files: ["src/lib/analytics.ts"],
  },
  "file-upload": {
    components: ["FileUploader"],
    files: ["src/lib/upload.ts"],
    dependencies: ["multer"],
  },
  oauth: {
    components: ["OAuthButtons"],
    files: ["src/lib/oauth.ts"],
    dependencies: ["next-auth"],
  },
  "roles-permissions": {
    components: ["RoleGuard"],
    files: ["src/lib/permissions.ts"],
  },
  "two-factor-auth": {
    components: ["TwoFactorForm"],
    files: ["src/lib/twofactor.ts"],
  },
  "audit-log": {
    components: ["AuditLogTable"],
    files: ["src/lib/audit-log.ts"],
    routes: ["/security/audit"],
  },
  "rate-limiting": {
    files: ["src/lib/rate-limit.ts"],
  },
  "rest-api": {
    files: ["src/app/api/v1/route.ts", "API.md"],
  },
  webhooks: {
    files: ["src/app/api/webhooks/route.ts", "src/lib/webhooks.ts"],
  },
  "mcp-server": {
    files: ["src/lib/mcp/server.ts", "MCP.md"],
  },
  "third-party-integration": {
    files: ["src/lib/integrations.ts"],
  },
  "realtime-sync": {
    files: ["src/lib/realtime.ts"],
    dependencies: ["ws"],
  },
  "data-export": {
    components: ["ExportButton"],
    files: ["src/lib/export.ts"],
  },
  marketplace: {
    components: ["MarketplaceBrowser", "SellerDashboard"],
    routes: ["/marketplace"],
    files: ["src/lib/marketplace.ts"],
  },
  "subscription-billing": {
    components: ["BillingPanel"],
    routes: ["/billing"],
    files: ["src/lib/billing.ts"],
    dependencies: ["stripe"],
  },
  invoicing: {
    components: ["InvoiceList"],
    files: ["src/lib/invoicing.ts"],
  },
  comments: {
    components: ["CommentThread", "CommentForm"],
    files: ["src/lib/comments.ts"],
  },
  cms: {
    components: ["ContentEditor", "ArticleList"],
    routes: ["/content"],
    files: ["src/lib/cms.ts"],
  },
  "media-gallery": {
    components: ["MediaGallery"],
    routes: ["/gallery"],
  },
  "reviews-ratings": {
    components: ["ReviewList", "RatingStars"],
    files: ["src/lib/reviews.ts"],
  },
  recommendations: {
    files: ["src/lib/recommendations.ts"],
  },
  multilingual: {
    files: ["src/lib/i18n.ts"],
    dependencies: ["next-intl"],
  },
  "team-workspace": {
    components: ["WorkspaceSwitcher", "TeamMembers"],
    routes: ["/workspace"],
    files: ["src/lib/workspace.ts"],
  },
  "calendar-scheduling": {
    components: ["Calendar", "BookingForm"],
    routes: ["/calendar"],
    files: ["src/lib/scheduling.ts"],
  },
  "automated-tests": {
    files: ["vitest.config.ts", "TESTING.md"],
    dependencies: ["vitest"],
  },
  "ci-cd": {
    files: [".github/workflows/deploy.yml", "DEPLOYMENT.md"],
  },
  monitoring: {
    files: ["src/app/api/health/route.ts"],
  },
  "error-tracking": {
    files: ["src/lib/error-tracking.ts"],
  },
  "backup-restore": {
    files: ["src/lib/backup.ts"],
  },
  accessibility: {
    files: ["ACCESSIBILITY.md"],
  },
};

const BASE_FOLDERS = [
  "src/app",
  "src/components",
  "src/lib",
  "src/types",
  "src/api",
  "public"
];

const BASE_FILES = [
  "package.json",
  "README.md",
  "tsconfig.json",
  "next.config.ts",
  "src/app/page.tsx",
  "src/app/layout.tsx"
];

const BASE_DEPENDENCIES = ["next", "react", "typescript", "@types/node", "@types/react"];

export class BlueprintGenerator {

  generate(input: ProjectBlueprint): BuildBlueprint {
    const folders = new Set<string>(BASE_FOLDERS);
    const files = new Set<string>(BASE_FILES);
    const components = new Set<string>();
    const routes = new Set<string>(["/"]);
    const dependencies = new Set<string>(BASE_DEPENDENCIES);

    for (const feature of input.features) {
      const mapping = FEATURE_MAP[feature.toLowerCase().trim()];
      if (!mapping) continue;

      mapping.components?.forEach((c) => components.add(c));
      mapping.routes?.forEach((r) => routes.add(r));
      mapping.files?.forEach((f) => files.add(f));
      mapping.dependencies?.forEach((d) => dependencies.add(d));
    }

    if (input.database && input.database !== "none") {
      files.add("src/lib/db.ts");
      files.add("prisma/schema.prisma");
      folders.add("prisma");
      dependencies.add("prisma");
      dependencies.add("@prisma/client");
    }

    if (input.authentication) {
      files.add("src/lib/auth.ts");
      components.add("AuthProvider");
      components.add("LoginForm");
      routes.add("/login");
    }

    if (input.deployment === "cloudflare") {
      files.add("wrangler.toml");
    }

    for (const component of components) {
      files.add(`src/components/${component}.tsx`);
    }

    const nameSource = input.projectName?.trim() || input.projectType || "app";
    const name = `zovo-${nameSource.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

    const { files: filesWithPages } = ensureRoutePageFiles(
      Array.from(routes),
      Array.from(components),
      Array.from(files)
    );

    return {
      name,
      folders: Array.from(folders),
      files: filesWithPages,
      components: Array.from(components),
      routes: Array.from(routes),
      dependencies: Array.from(dependencies)
    };
  }
}

const blueprintgeneratorInstance = new BlueprintGenerator();
export default blueprintgeneratorInstance;

const ROUTE_COMPONENT_MAP_BG: Record<string, string[]> = {
  "/dashboard": ["Dashboard", "DashboardStats"],
  "/login": ["LoginForm"],
  "/signup": ["SignupForm"],
  "/items": ["ItemList", "ItemForm"],
  "/search": ["SearchBar", "SearchResults"],
  "/profile": ["ProfileForm", "AvatarUpload"],
  "/admin": ["AdminPanel", "UserTable"],
};

export function ensureRoutePageFiles(
  routes: string[],
  components: string[],
  files: string[]
): { files: string[]; pageComponentMap: Record<string, string[]> } {
  const updatedFiles = [...files];
  const pageComponentMap: Record<string, string[]> = {};

  for (const route of routes) {
    if (route === "/") continue;

    const pagePath = `src/app${route}/page.tsx`;
    if (!updatedFiles.includes(pagePath)) {
      updatedFiles.push(pagePath);
    }

    const wanted = ROUTE_COMPONENT_MAP_BG[route] || [];
    pageComponentMap[route] = wanted.filter((c) => components.includes(c));
  }

  return { files: updatedFiles, pageComponentMap };
}
