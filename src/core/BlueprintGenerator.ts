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

    const nameSource = input.projectType || "app";
    const name = `zovo-${nameSource.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

    return {
      name,
      folders: Array.from(folders),
      files: Array.from(files),
      components: Array.from(components),
      routes: Array.from(routes),
      dependencies: Array.from(dependencies)
    };
  }
}

const blueprintgeneratorInstance = new BlueprintGenerator();
export default blueprintgeneratorInstance;
