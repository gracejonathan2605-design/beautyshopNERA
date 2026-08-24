import "dotenv/config";
import { PrismaClient, ProductStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSION_CATALOG, ROLE_PRESETS } from "../src/lib/permissions";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { slugify } from "../src/lib/pricing";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nerabeaute.cm";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "NeraAdmin2026!";
  const cashierEmail = process.env.SEED_CASHIER_EMAIL ?? "caisse@nerabeaute.cm";
  const cashierPassword = process.env.SEED_CASHIER_PASSWORD ?? "Caisse2026!";

  await prisma.$transaction(async (tx) => {
    for (const permission of PERMISSION_CATALOG) {
      await tx.permission.upsert({
        where: { code: permission.code },
        update: { groupName: permission.groupName, description: permission.description },
        create: permission,
      });
    }

    const allPermissions = await tx.permission.findMany();
    const byCode = new Map(allPermissions.map((p) => [p.code, p.id]));

    async function upsertRole(
      name: string,
      slug: string,
      description: string,
      codes: string[],
      isSuperAdmin = false,
    ) {
      const role = await tx.role.upsert({
        where: { slug },
        update: { name, description, isSystem: true, isSuperAdmin },
        create: { name, slug, description, isSystem: true, isSuperAdmin },
      });
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({
        data: codes
          .map((code) => byCode.get(code))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
      return role;
    }

    const superRole = await upsertRole(
      "Super administrateur",
      "super-admin",
      "Accès total à NERA Beauté & Shop",
      PERMISSION_CATALOG.map((p) => p.code),
      true,
    );
    const adminRole = await upsertRole("Administrateur", "admin", "Gestion complète sauf rôles système", ROLE_PRESETS.admin);
    const managerRole = await upsertRole("Manager", "manager", "Pilotage boutique, stock et ventes", ROLE_PRESETS.manager);
    const cashierRole = await upsertRole("Caissier", "caissier", "Caisse et clients", ROLE_PRESETS.cashier);
    const stockRole = await upsertRole("Gestionnaire stock", "stock", "Achats et inventaire", ROLE_PRESETS.stock_manager);
    await upsertRole("Vendeur", "vendeur", "Ventes et commandes", ROLE_PRESETS.sales);

    const adminHash = await bcrypt.hash(adminPassword, 12);
    const cashierHash = await bcrypt.hash(cashierPassword, 12);
    const stockHash = await bcrypt.hash("Stock2026!", 12);

    await tx.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: adminHash, roleId: superRole.id, isActive: true, firstName: "Raisa", lastName: "Kouekam" },
      create: {
        email: adminEmail,
        passwordHash: adminHash,
        firstName: "Raisa",
        lastName: "Kouekam",
        phone: "+237 6 70 00 00 01",
        roleId: superRole.id,
      },
    });
    await tx.user.upsert({
      where: { email: cashierEmail },
      update: { passwordHash: cashierHash, roleId: cashierRole.id, isActive: true },
      create: {
        email: cashierEmail,
        passwordHash: cashierHash,
        firstName: "Amina",
        lastName: "Ngo",
        phone: "+237 6 70 00 00 02",
        roleId: cashierRole.id,
      },
    });
    await tx.user.upsert({
      where: { email: "stock@nerabeaute.cm" },
      update: { passwordHash: stockHash, roleId: stockRole.id },
      create: {
        email: "stock@nerabeaute.cm",
        passwordHash: stockHash,
        firstName: "Jean",
        lastName: "Mbarga",
        phone: "+237 6 70 00 00 03",
        roleId: stockRole.id,
      },
    });
    await tx.user.upsert({
      where: { email: "admin.ops@nerabeaute.cm" },
      update: { roleId: adminRole.id },
      create: {
        email: "admin.ops@nerabeaute.cm",
        passwordHash: await bcrypt.hash("AdminOps2026!", 12),
        firstName: "Nadia",
        lastName: "Fouda",
        roleId: adminRole.id,
      },
    });
    await tx.user.upsert({
      where: { email: "manager@nerabeaute.cm" },
      update: { roleId: managerRole.id },
      create: {
        email: "manager@nerabeaute.cm",
        passwordHash: await bcrypt.hash("Manager2026!", 12),
        firstName: "Chantal",
        lastName: "Ewane",
        roleId: managerRole.id,
      },
    });

    const location = await tx.location.upsert({
      where: { code: "YDE-01" },
      update: { isDefault: true, isActive: true },
      create: {
        name: "Boutique Yaoundé",
        code: "YDE-01",
        address: "Marché Central",
        city: "Yaoundé",
        isDefault: true,
      },
    });

    await tx.cashRegister.upsert({
      where: { id: "seed-register-1" },
      update: {},
      create: { id: "seed-register-1", name: "Caisse 1", locationId: location.id },
    }).catch(async () => {
      const existing = await tx.cashRegister.findFirst({ where: { locationId: location.id, name: "Caisse 1" } });
      if (!existing) {
        await tx.cashRegister.create({ data: { name: "Caisse 1", locationId: location.id } });
      }
    });

    await tx.setting.upsert({
      where: { key: "shop" },
      update: { value: DEFAULT_SETTINGS },
      create: { key: "shop", value: DEFAULT_SETTINGS },
    });

    const expenseCats = ["Transport", "Livraison", "Electricité", "Internet", "Salaires", "Fournitures", "Achat marchandises", "Marketing", "Autre"];
    for (const name of expenseCats) {
      await tx.expenseCategory.upsert({
        where: { slug: slugify(name) },
        update: { name },
        create: { name, slug: slugify(name) },
      });
    }

    const zones = [
      { name: "Yaoundé centre", fee: 1500, sortOrder: 1 },
      { name: "Yaoundé périphérie", fee: 2500, sortOrder: 2 },
      { name: "Douala", fee: 4000, sortOrder: 3 },
      { name: "Autres villes", fee: 6000, sortOrder: 4 },
    ];
    for (const zone of zones) {
      const found = await tx.deliveryZone.findFirst({ where: { name: zone.name } });
      if (found) await tx.deliveryZone.update({ where: { id: found.id }, data: zone });
      else await tx.deliveryZone.create({ data: zone });
    }

    async function category(name: string, parentId?: string) {
      const slug = slugify(name);
      return tx.category.upsert({
        where: { slug },
        update: { name, parentId, isActive: true },
        create: { name, slug, parentId, isActive: true },
      });
    }

    const beaute = await category("Beauté");
    const cheveux = await category("Cheveux");
    const mode = await category("Mode");
    await category("Visage", beaute.id);
    const corps = await category("Corps", beaute.id);
    const maquillage = await category("Maquillage", beaute.id);
    const parfums = await category("Parfums", beaute.id);
    const meches = await category("Mèches", cheveux.id);
    const perruques = await category("Perruques", cheveux.id);
    await category("Extensions", cheveux.id);
    const sacs = await category("Sacs", mode.id);
    const chaussures = await category("Chaussures", mode.id);
    const bijoux = await category("Bijoux", mode.id);
    const accessoires = await category("Accessoires", mode.id);

    const brand = await tx.brand.upsert({
      where: { slug: "nera" },
      update: {},
      create: { name: "NERA", slug: "nera" },
    });
    await tx.brand.upsert({
      where: { slug: "vagheggi" },
      update: {},
      create: { name: "Vagheggi", slug: "vagheggi" },
    });

    const supplier = await tx.supplier.upsert({
      where: { code: "SUP-000001" },
      update: {},
      create: {
        code: "SUP-000001",
        name: "Grossiste Beauté Douala",
        phone: "+237 6 99 00 00 10",
        city: "Douala",
      },
    });

    const longueur = await tx.attribute.upsert({
      where: { slug: "longueur" },
      update: {},
      create: { name: "Longueur", slug: "longueur" },
    });
    const couleur = await tx.attribute.upsert({
      where: { slug: "couleur" },
      update: {},
      create: { name: "Couleur", slug: "couleur" },
    });
    const pointure = await tx.attribute.upsert({
      where: { slug: "pointure" },
      update: {},
      create: { name: "Pointure", slug: "pointure" },
    });

    async function attrValues(attributeId: string, values: string[]) {
      const rows = [];
      for (const value of values) {
        const slug = slugify(value);
        const row = await tx.attributeValue.upsert({
          where: { attributeId_slug: { attributeId, slug } },
          update: { value },
          create: { attributeId, value, slug },
        });
        rows.push(row);
      }
      return rows;
    }
    const lengths = await attrValues(longueur.id, ["10 pouces", "12 pouces", "14 pouces", "16 pouces", "18 pouces", "20 pouces", "22 pouces", "24 pouces"]);
    const colors = await attrValues(couleur.id, ["Noir", "Beige", "Marron"]);
    const sizes = await attrValues(pointure.id, ["37", "38", "39", "40", "41"]);

    async function product(opts: {
      name: string;
      categoryId: string;
      short: string;
      featured?: boolean;
      isNew?: boolean;
      isPromo?: boolean;
      variants: { name: string; sku: string; cost: number; sale: number; promo?: number; qty: number; attrs?: string[] }[];
    }) {
      const slug = slugify(opts.name);
      const product = await tx.product.upsert({
        where: { slug },
        update: {
          name: opts.name,
          shortDescription: opts.short,
          status: ProductStatus.ACTIVE,
          categoryId: opts.categoryId,
          brandId: brand.id,
          supplierId: supplier.id,
          isFeatured: opts.featured ?? false,
          isNew: opts.isNew ?? false,
          isPromo: opts.isPromo ?? false,
          onlineVisible: true,
        },
        create: {
          name: opts.name,
          slug,
          shortDescription: opts.short,
          status: ProductStatus.ACTIVE,
          categoryId: opts.categoryId,
          brandId: brand.id,
          supplierId: supplier.id,
          isFeatured: opts.featured ?? false,
          isNew: opts.isNew ?? false,
          isPromo: opts.isPromo ?? false,
        },
      });
      for (const [index, variant] of opts.variants.entries()) {
        const row = await tx.productVariant.upsert({
          where: { sku: variant.sku },
          update: {
            name: variant.name,
            costPrice: variant.cost,
            salePrice: variant.sale,
            promoPrice: variant.promo ?? null,
            isDefault: index === 0,
            isActive: true,
          },
          create: {
            productId: product.id,
            name: variant.name,
            sku: variant.sku,
            costPrice: variant.cost,
            salePrice: variant.sale,
            promoPrice: variant.promo ?? null,
            isDefault: index === 0,
          },
        });
        if (variant.attrs?.length) {
          await tx.variantAttributeValue.deleteMany({ where: { variantId: row.id } });
          await tx.variantAttributeValue.createMany({
            data: variant.attrs.map((id) => ({ variantId: row.id, attributeValueId: id })),
            skipDuplicates: true,
          });
        }
        await tx.inventory.upsert({
          where: { variantId_locationId: { variantId: row.id, locationId: location.id } },
          update: { onHand: variant.qty, minQuantity: 3 },
          create: { variantId: row.id, locationId: location.id, onHand: variant.qty, minQuantity: 3 },
        });
      }
    }

    const lengthPrices = [45000, 52000, 60000, 68000, 75000, 82000, 90000, 98000];
    await product({
      name: "Mèche brésilienne Body Wave",
      categoryId: meches.id,
      short: "Mèche brésilienne ondulée, texture soyeuse, pose facile.",
      featured: true,
      variants: lengths.map((l, i) => ({
        name: l.value,
        sku: `MEC-BW-${10 + i * 2}`,
        cost: lengthPrices[i] - 15000,
        sale: lengthPrices[i],
        qty: i === 4 ? 2 : 8,
        attrs: [l.id],
      })),
    });
    await product({
      name: "Mèche brésilienne Straight",
      categoryId: meches.id,
      short: "Mèche lisse brésilienne, brillance naturelle.",
      isNew: true,
      variants: lengths.map((l, i) => ({
        name: l.value,
        sku: `MEC-ST-${10 + i * 2}`,
        cost: lengthPrices[i] - 14000,
        sale: lengthPrices[i] + 2000,
        qty: 6,
        attrs: [l.id],
      })),
    });
    await product({
      name: "Perruque naturelle lace front",
      categoryId: perruques.id,
      short: "Perruque lace front en cheveux naturels, look invisible.",
      featured: true,
      variants: [{ name: "Standard", sku: "PER-LF-001", cost: 85000, sale: 125000, qty: 4 }],
    });
    await product({
      name: "Lait corporel hydratant",
      categoryId: corps.id,
      short: "Lait nourrissant pour peaux sèches, parfum vanille.",
      variants: [{ name: "500 ml", sku: "COR-LAIT-500", cost: 2500, sale: 6500, qty: 24 }],
    });
    await product({
      name: "Parfum femme NERA Or",
      categoryId: parfums.id,
      short: "Eau de parfum florale-orientale, tenue longue.",
      featured: true,
      isPromo: true,
      variants: [{ name: "50 ml", sku: "PAR-OR-50", cost: 12000, sale: 28000, promo: 24500, qty: 10 }],
    });
    await product({
      name: "Sac à main cuir camel",
      categoryId: sacs.id,
      short: "Sac structuré, finitions dorées, format quotidien.",
      variants: [{ name: "Camel", sku: "SAC-CAM-01", cost: 18000, sale: 35000, qty: 7 }],
    });
    const sandaleVariants = [];
    for (const color of colors.filter((c) => c.value === "Noir" || c.value === "Beige")) {
      for (const size of sizes) {
        sandaleVariants.push({
          name: `${color.value} / ${size.value}`,
          sku: `SAN-${color.slug}-${size.value}`,
          cost: 9000,
          sale: 18000,
          qty: color.value === "Noir" && size.value === "38" ? 1 : 5,
          attrs: [color.id, size.id],
        });
      }
    }
    await product({
      name: "Sandale femme",
      categoryId: chaussures.id,
      short: "Sandale confort, semelle antidérapante.",
      isNew: true,
      variants: sandaleVariants,
    });
    await product({
      name: "Boucles d'oreilles dorées",
      categoryId: bijoux.id,
      short: "Créoles légères, plaqué or.",
      variants: [{ name: "Doré", sku: "BIJ-ORE-01", cost: 2000, sale: 5500, qty: 15 }],
    });
    await product({
      name: "Ceinture femme cuir",
      categoryId: accessoires.id,
      short: "Ceinture fine, boucle dorée.",
      variants: [{ name: "Noir", sku: "ACC-CEI-01", cost: 3000, sale: 8000, qty: 12 }],
    });
    await product({
      name: "Gloss hydratant",
      categoryId: maquillage.id,
      short: "Gloss non collant, effet glossy.",
      isPromo: true,
      variants: [
        { name: "Nude", sku: "MAQ-GLO-NU", cost: 1500, sale: 4500, promo: 3900, qty: 20 },
        { name: "Rose", sku: "MAQ-GLO-RO", cost: 1500, sale: 4500, qty: 18 },
      ],
    });

    const customerHash = await bcrypt.hash("Client2026!", 12);
    await tx.customer.upsert({
      where: { email: "marie.client@example.com" },
      update: {},
      create: {
        code: "CLI-000001",
        firstName: "Marie",
        lastName: "Abega",
        email: "marie.client@example.com",
        phone: "+237 6 55 00 00 21",
        city: "Yaoundé",
        passwordHash: customerHash,
      },
    });
    await tx.customer.upsert({
      where: { code: "CLI-000002" },
      update: {},
      create: {
        code: "CLI-000002",
        firstName: "Sandrine",
        lastName: "Owona",
        phone: "+237 6 55 00 00 22",
        city: "Yaoundé",
      },
    });

    await tx.coupon.upsert({
      where: { code: "NERA10" },
      update: { isActive: true },
      create: {
        code: "NERA10",
        type: "PERCENT",
        value: 10,
        minAmount: 20000,
        maxUses: 100,
      },
    });
  });

  console.log("Seed NERA terminé.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Caisse: ${cashierEmail} / ${cashierPassword}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
