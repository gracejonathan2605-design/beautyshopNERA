export type PermissionCode =
  | "dashboard.view"
  | "pos.access"
  | "products.view"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "categories.view"
  | "categories.create"
  | "categories.update"
  | "categories.delete"
  | "attributes.view"
  | "attributes.manage"
  | "brands.view"
  | "brands.manage"
  | "stock.view"
  | "stock.adjust"
  | "stock.purchase"
  | "sales.view"
  | "sales.create"
  | "sales.cancel"
  | "sales.refund"
  | "orders.view"
  | "orders.update"
  | "orders.cancel"
  | "customers.view"
  | "customers.create"
  | "customers.update"
  | "customers.delete"
  | "suppliers.view"
  | "suppliers.manage"
  | "expenses.view"
  | "expenses.manage"
  | "reports.view"
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "roles.manage"
  | "promotions.manage"
  | "settings.view"
  | "settings.update"
  | "audit.view";

export const PERMISSION_CATALOG: {
  code: PermissionCode;
  groupName: string;
  description: string;
}[] = [
  { code: "dashboard.view", groupName: "Tableau de bord", description: "Voir le tableau de bord" },
  { code: "pos.access", groupName: "Caisse", description: "Accéder au point de vente" },
  { code: "products.view", groupName: "Catalogue", description: "Voir les produits" },
  { code: "products.create", groupName: "Catalogue", description: "Créer un produit" },
  { code: "products.update", groupName: "Catalogue", description: "Modifier un produit" },
  { code: "products.delete", groupName: "Catalogue", description: "Supprimer un produit" },
  { code: "categories.view", groupName: "Catalogue", description: "Voir les catégories" },
  { code: "categories.create", groupName: "Catalogue", description: "Créer une catégorie" },
  { code: "categories.update", groupName: "Catalogue", description: "Modifier une catégorie" },
  { code: "categories.delete", groupName: "Catalogue", description: "Supprimer une catégorie" },
  { code: "attributes.view", groupName: "Catalogue", description: "Voir les attributs" },
  { code: "attributes.manage", groupName: "Catalogue", description: "Gérer les attributs" },
  { code: "brands.view", groupName: "Catalogue", description: "Voir les marques" },
  { code: "brands.manage", groupName: "Catalogue", description: "Gérer les marques" },
  { code: "stock.view", groupName: "Stock", description: "Voir le stock" },
  { code: "stock.adjust", groupName: "Stock", description: "Ajuster le stock" },
  { code: "stock.purchase", groupName: "Stock", description: "Enregistrer un achat fournisseur" },
  { code: "sales.view", groupName: "Ventes", description: "Voir les ventes POS" },
  { code: "sales.create", groupName: "Ventes", description: "Créer une vente POS" },
  { code: "sales.cancel", groupName: "Ventes", description: "Annuler une vente" },
  { code: "sales.refund", groupName: "Ventes", description: "Rembourser une vente" },
  { code: "orders.view", groupName: "Commandes", description: "Voir les commandes en ligne" },
  { code: "orders.update", groupName: "Commandes", description: "Modifier le statut d'une commande" },
  { code: "orders.cancel", groupName: "Commandes", description: "Annuler une commande" },
  { code: "customers.view", groupName: "Clients", description: "Voir les clients" },
  { code: "customers.create", groupName: "Clients", description: "Créer un client" },
  { code: "customers.update", groupName: "Clients", description: "Modifier un client" },
  { code: "customers.delete", groupName: "Clients", description: "Supprimer un client" },
  { code: "suppliers.view", groupName: "Fournisseurs", description: "Voir les fournisseurs" },
  { code: "suppliers.manage", groupName: "Fournisseurs", description: "Gérer les fournisseurs" },
  { code: "expenses.view", groupName: "Finances", description: "Voir les dépenses" },
  { code: "expenses.manage", groupName: "Finances", description: "Gérer les dépenses" },
  { code: "reports.view", groupName: "Finances", description: "Voir les rapports" },
  { code: "users.view", groupName: "Utilisateurs", description: "Voir les utilisateurs" },
  { code: "users.create", groupName: "Utilisateurs", description: "Créer un utilisateur" },
  { code: "users.update", groupName: "Utilisateurs", description: "Modifier un utilisateur" },
  { code: "users.delete", groupName: "Utilisateurs", description: "Désactiver un utilisateur" },
  { code: "roles.manage", groupName: "Utilisateurs", description: "Gérer les rôles et permissions" },
  { code: "promotions.manage", groupName: "Boutique", description: "Gérer promotions, coupons et livraison" },
  { code: "settings.view", groupName: "Paramètres", description: "Voir les paramètres" },
  { code: "settings.update", groupName: "Paramètres", description: "Modifier les paramètres" },
  { code: "audit.view", groupName: "Paramètres", description: "Voir le journal d'audit" },
];

export const ROLE_PRESETS: Record<string, PermissionCode[]> = {
  admin: PERMISSION_CATALOG.map((p) => p.code),
  manager: [
    "dashboard.view",
    "pos.access",
    "products.view",
    "products.create",
    "products.update",
    "categories.view",
    "categories.create",
    "categories.update",
    "attributes.view",
    "brands.view",
    "brands.manage",
    "stock.view",
    "stock.adjust",
    "stock.purchase",
    "sales.view",
    "sales.create",
    "sales.cancel",
    "sales.refund",
    "orders.view",
    "orders.update",
    "orders.cancel",
    "customers.view",
    "customers.create",
    "customers.update",
    "suppliers.view",
    "suppliers.manage",
    "expenses.view",
    "expenses.manage",
    "reports.view",
    "promotions.manage",
    "settings.view",
  ],
  cashier: [
    "pos.access",
    "products.view",
    "stock.view",
    "sales.view",
    "sales.create",
    "sales.refund",
    "customers.view",
    "customers.create",
    "customers.update",
  ],
  stock_manager: [
    "dashboard.view",
    "products.view",
    "categories.view",
    "stock.view",
    "stock.adjust",
    "stock.purchase",
    "suppliers.view",
    "suppliers.manage",
  ],
  sales: [
    "pos.access",
    "products.view",
    "sales.view",
    "sales.create",
    "sales.refund",
    "orders.view",
    "customers.view",
    "customers.create",
  ],
};

export type StaffAuthz = {
  isSuperAdmin?: boolean;
  permissions: string[];
};

export function hasPermission(
  session: StaffAuthz | null | undefined,
  code: PermissionCode,
) {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return session.permissions.includes(code);
}

export function defaultStaffPath(session: StaffAuthz) {
  if (hasPermission(session, "dashboard.view")) return "/admin";
  if (hasPermission(session, "pos.access")) return "/pos";
  if (hasPermission(session, "stock.view")) return "/admin/stocks";
  return "/admin";
}
