"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./TokamaOnsiteMenu.module.css";

type MenuOption = {
  id: string;
  name: string;
  priceCents: number;
  isDefault: boolean;
  isDiscountEligible: boolean;
};

type MenuOptionGroup = {
  id: string;
  name: string;
  helperText: string | null;
  selectionType: "single" | "multiple";
  minSelected: number;
  maxSelected: number;
  options: MenuOption[];
};

type MenuProduct = {
  id: string;
  sourceKey: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  dietaryTags: string[];
  allergens: string[];
  isDiscountEligible: boolean;
  optionGroups: MenuOptionGroup[];
};

type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products: MenuProduct[];
};

type Vendor = {
  name: string;
  description: string | null;
  discountPercent: number;
  deliveryCents: number;
};

type CartItem = {
  key: string;
  productId: string;
  quantity: number;
  optionIds: string[];
  specialInstructions: string;
};

type CartLine = {
  cartItem: CartItem;
  product: MenuProduct;
  selectedOptions: Array<MenuOption & { groupName: string }>;
  originalUnitCents: number;
  discountableUnitCents: number;
  nonDiscountedUnitCents: number;
  originalTotalCents: number;
};

type Props = {
  houseCode: string;
};

function money(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function discountedPrice(value: number, discountPercent: number) {
  return value - Math.round((value * discountPercent) / 100);
}

export function TokamaOnsiteMenu({ houseCode }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);
  const [draftOptionIds, setDraftOptionIds] = useState<string[]>([]);
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftError, setDraftError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderDiscount, setOrderDiscount] = useState(0);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetch(`/api/tokama-onsite/catalog?house=${houseCode}`, {
          credentials: "include",
          cache: "no-store",
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.ok) {
          setCatalogError(result?.message || "Sesja pobytu wygasła.");
          return;
        }

        setVendor(result.vendor || null);
        setCategories(Array.isArray(result.categories) ? result.categories : []);
      } catch {
        setCatalogError("Nie udało się pobrać menu.");
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();
  }, [houseCode]);

  const products = useMemo(
    () => categories.flatMap((category) => category.products),
    [categories]
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const cartLines = useMemo(() => {
    return cart
      .map((cartItem): CartLine | null => {
        const product = productById.get(cartItem.productId);

        if (!product) return null;

        const selectedOptions = product.optionGroups.flatMap((group) =>
          group.options
            .filter((option) => cartItem.optionIds.includes(option.id))
            .map((option) => ({ ...option, groupName: group.name }))
        );

        let originalUnitCents = product.priceCents;
        let discountableUnitCents = product.isDiscountEligible
          ? product.priceCents
          : 0;
        let nonDiscountedUnitCents = product.isDiscountEligible
          ? 0
          : product.priceCents;

        for (const option of selectedOptions) {
          originalUnitCents += option.priceCents;

          if (option.isDiscountEligible) {
            discountableUnitCents += option.priceCents;
          } else {
            nonDiscountedUnitCents += option.priceCents;
          }
        }

        return {
          cartItem,
          product,
          selectedOptions,
          originalUnitCents,
          discountableUnitCents,
          nonDiscountedUnitCents,
          originalTotalCents: originalUnitCents * cartItem.quantity,
        };
      })
      .filter((line): line is CartLine => Boolean(line));
  }, [cart, productById]);

  const totals = useMemo(() => {
    const foodSubtotalCents = cartLines.reduce(
      (sum, line) => sum + line.discountableUnitCents * line.cartItem.quantity,
      0
    );
    const nonDiscountedSubtotalCents = cartLines.reduce(
      (sum, line) => sum + line.nonDiscountedUnitCents * line.cartItem.quantity,
      0
    );
    const subtotalCents = foodSubtotalCents + nonDiscountedSubtotalCents;
    const discountCents = Math.round(
      (foodSubtotalCents * Number(vendor?.discountPercent || 0)) / 100
    );
    const deliveryCents = Number(vendor?.deliveryCents || 0);

    return {
      foodSubtotalCents,
      nonDiscountedSubtotalCents,
      subtotalCents,
      discountCents,
      deliveryCents,
      totalCents: subtotalCents - discountCents + deliveryCents,
      count: cartLines.reduce((sum, line) => sum + line.cartItem.quantity, 0),
    };
  }, [cartLines, vendor]);

  function openProduct(product: MenuProduct) {
    const defaults = product.optionGroups.flatMap((group) =>
      group.options.filter((option) => option.isDefault).map((option) => option.id)
    );

    setActiveProduct(product);
    setDraftOptionIds([...new Set(defaults)]);
    setDraftQuantity(1);
    setDraftInstructions("");
    setDraftError("");
  }

  function closeProduct() {
    setActiveProduct(null);
    setDraftError("");
  }

  function toggleDraftOption(group: MenuOptionGroup, optionId: string) {
    setDraftError("");

    setDraftOptionIds((current) => {
      const selected = new Set(current);
      const isSelected = selected.has(optionId);

      if (group.selectionType === "single") {
        for (const option of group.options) {
          selected.delete(option.id);
        }

        if (!isSelected) {
          selected.add(optionId);
        }

        return [...selected];
      }

      if (isSelected) {
        selected.delete(optionId);
        return [...selected];
      }

      const selectedInGroup = group.options.filter((option) => selected.has(option.id)).length;

      if (group.maxSelected > 0 && selectedInGroup >= group.maxSelected) {
        setDraftError(`Możesz wybrać maksymalnie ${group.maxSelected} opcji: ${group.name}.`);
        return current;
      }

      selected.add(optionId);
      return [...selected];
    });
  }

  function validateDraft() {
    if (!activeProduct) return "Nie wybrano dania.";

    for (const group of activeProduct.optionGroups) {
      const selectedCount = group.options.filter((option) =>
        draftOptionIds.includes(option.id)
      ).length;

      if (selectedCount < group.minSelected) {
        return `Wybierz: ${group.name}.`;
      }

      if (
        (group.selectionType === "single" && selectedCount > 1) ||
        (group.maxSelected > 0 && selectedCount > group.maxSelected)
      ) {
        return `Sprawdź wybór w sekcji: ${group.name}.`;
      }
    }

    return "";
  }

  function addToCart() {
    if (!activeProduct) return;

    const validationMessage = validateDraft();

    if (validationMessage) {
      setDraftError(validationMessage);
      return;
    }

    setCart((current) => [
      ...current,
      {
        key: `${activeProduct.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        productId: activeProduct.id,
        quantity: draftQuantity,
        optionIds: draftOptionIds,
        specialInstructions: draftInstructions.trim().slice(0, 600),
      },
    ]);
    closeProduct();
  }

  function changeCartQuantity(key: string, change: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.key !== key) return [item];

        const nextQuantity = item.quantity + change;

        if (nextQuantity < 1) return [];

        return [{ ...item, quantity: Math.min(10, nextQuantity) }];
      })
    );
  }

  function removeCartItem(key: string) {
    setCart((current) => current.filter((item) => item.key !== key));
  }

  function scrollToCategory(id: string) {
    document.getElementById(`menu-category-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function submitOrder() {
    if (!cartLines.length || submitting) return;

    setSubmitting(true);
    setSubmissionError("");

    try {
      const response = await fetch("/api/tokama-onsite/orders", {
        credentials: "include",
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          house: houseCode,
          note: orderNote.trim().slice(0, 800),
          items: cart.map((item) => ({
            productId: item.productId,
            optionIds: item.optionIds,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
          })),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setSubmissionError(result?.message || "Nie udało się wysłać zamówienia.");
        return;
      }

      setOrderCode(String(result.order.code || ""));
      setOrderTotal(Number(result.order.totalCents || 0));
      setOrderDiscount(Number(result.order.discountCents || 0));
      setCart([]);
    } catch {
      setSubmissionError("Nie udało się wysłać zamówienia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>Ładujemy menu…</p>
      </main>
    );
  }

  if (catalogError) {
    return (
      <main className={styles.page}>
        <section className={styles.errorScreen}>
          <h1>Nie udało się<br />otworzyć <em>menu.</em></h1>
          <p>{catalogError}</p>
          <a href={`/pobyt/${houseCode.toLowerCase()}`}>Wróć do weryfikacji</a>
        </section>
      </main>
    );
  }

  if (orderCode) {
    return (
      <main className={styles.page}>
        <section className={styles.successScreen}>
          <p className={styles.kicker}>TOKAMA · DOMEK {houseCode}</p>
          <h1>Zamówienie<br /><em>przyjęte.</em></h1>
          <p>Numer zamówienia: <strong>{orderCode}</strong></p>
          {orderDiscount > 0 ? <p>Rabat TOKAMA: <strong>−{money(orderDiscount)}</strong></p> : null}
          <p>Do zapłaty: <strong>{money(orderTotal)}</strong></p>
          <p className={styles.successNote}>
            Gospodarz otrzymał Twoje zamówienie. Potwierdzimy możliwość realizacji i przekażemy je do restauracji.
          </p>
          <a href={`/pobyt/${houseCode.toLowerCase()}`} className={styles.backLink}>
            Wróć do pobytu
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.menu}>
        <header className={styles.header}>
          <p className={styles.kicker}>TOKAMA · DOMEK {houseCode}</p>
          <h1>Menu podczas<br /><em>Twojego pobytu.</em></h1>
          <p className={styles.headerText}>
            {vendor?.name || "KANZAN"} dostarczy zamówienie prosto do domku.
            {vendor?.discountPercent
              ? ` Dania objęte są rabatem ${vendor.discountPercent}% dla gości TOKAMA — napoje nie są objęte rabatem.`
              : ""}
            {vendor?.deliveryCents === 0 ? " Dostawa jest gratis." : ""}
          </p>
        </header>

        {!products.length ? (
          <p className={styles.empty}>Aktualnie nie ma dostępnych pozycji do zamówienia.</p>
        ) : (
          <>
            <nav className={styles.categoryNav} aria-label="Kategorie menu">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => scrollToCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </nav>

            <div className={styles.layout}>
              <div className={styles.catalog}>
                {categories.map((category) => (
                  <section
                    key={category.id}
                    id={`menu-category-${category.id}`}
                    className={styles.category}
                  >
                    <div className={styles.categoryHeading}>
                      <h2>{category.name}</h2>
                      {category.description ? <p>{category.description}</p> : null}
                    </div>

                    <div className={styles.productGrid}>
                      {category.products.map((product) => {
                        const priceAfterDiscount = product.isDiscountEligible
                          ? discountedPrice(product.priceCents, Number(vendor?.discountPercent || 0))
                          : product.priceCents;

                        return (
                          <article key={product.id} className={styles.product}>
                            <button
                              type="button"
                              className={styles.productButton}
                              onClick={() => openProduct(product)}
                            >
                              <span className={styles.productContent}>
                                <span className={styles.productTopline}>
                                  <strong>{product.name}</strong>
                                  <span className={styles.addMark}>+</span>
                                </span>

                                {product.description ? (
                                  <span className={styles.productDescription}>{product.description}</span>
                                ) : null}

                                {product.dietaryTags.length ? (
                                  <span className={styles.tags}>{product.dietaryTags.join(" · ")}</span>
                                ) : null}

                                <span className={styles.priceLine}>
                                  <b>{money(priceAfterDiscount)}</b>
                                  {product.isDiscountEligible && vendor?.discountPercent ? (
                                    <small>
                                      −{vendor.discountPercent}% dla gości TOKAMA
                                    </small>
                                  ) : (
                                    <small>Bez rabatu</small>
                                  )}
                                </span>
                              </span>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <aside className={styles.cart}>
                <p className={styles.cartEyebrow}>Twoje zamówienie</p>

                {!cartLines.length ? (
                  <p className={styles.emptyCart}>Dodaj dania z menu, aby utworzyć zamówienie.</p>
                ) : (
                  <>
                    <div className={styles.cartLines}>
                      {cartLines.map((line) => (
                        <article key={line.cartItem.key} className={styles.cartLine}>
                          <div className={styles.cartLineMain}>
                            <strong>{line.product.name}</strong>
                            {line.selectedOptions.length ? (
                              <small>{line.selectedOptions.map((option) => option.name).join(", ")}</small>
                            ) : null}
                            {line.cartItem.specialInstructions ? (
                              <small>Uwagi: {line.cartItem.specialInstructions}</small>
                            ) : null}
                          </div>

                          <div className={styles.cartLineActions}>
                            <button
                              type="button"
                              aria-label={`Zmniejsz ilość: ${line.product.name}`}
                              onClick={() => changeCartQuantity(line.cartItem.key, -1)}
                            >
                              −
                            </button>
                            <span>{line.cartItem.quantity}</span>
                            <button
                              type="button"
                              aria-label={`Zwiększ ilość: ${line.product.name}`}
                              onClick={() => changeCartQuantity(line.cartItem.key, 1)}
                            >
                              +
                            </button>
                          </div>

                          <div className={styles.cartLineBottom}>
                            <b>{money(line.originalTotalCents)}</b>
                            <button
                              type="button"
                              className={styles.remove}
                              onClick={() => removeCartItem(line.cartItem.key)}
                            >
                              Usuń
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>

                    <label className={styles.orderNote}>
                      <span>Uwagi do całego zamówienia</span>
                      <textarea
                        value={orderNote}
                        onChange={(event) => setOrderNote(event.target.value)}
                        placeholder="Np. proszę o kontakt telefoniczny przy dostawie"
                        rows={3}
                      />
                    </label>

                    <div className={styles.totals}>
                      <span><i>Produkty</i><b>{money(totals.subtotalCents)}</b></span>
                      {totals.discountCents ? (
                        <span className={styles.discount}>
                          <i>Rabat TOKAMA</i>
                          <b>−{money(totals.discountCents)}</b>
                        </span>
                      ) : null}
                      <span><i>Dostawa</i><b>{totals.deliveryCents ? money(totals.deliveryCents) : "Gratis"}</b></span>
                      <span className={styles.grandTotal}><i>Do zapłaty</i><b>{money(totals.totalCents)}</b></span>
                    </div>

                    {submissionError ? <p className={styles.submissionError}>{submissionError}</p> : null}

                    <button
                      type="button"
                      className={styles.submit}
                      onClick={submitOrder}
                      disabled={submitting}
                    >
                      {submitting
                        ? "Wysyłanie…"
                        : `Złóż zamówienie · ${money(totals.totalCents)}`}
                    </button>
                  </>
                )}
              </aside>
            </div>

            {cartLines.length ? (
              <button
                type="button"
                className={styles.mobileCart}
                onClick={() => document.querySelector(`.${styles.cart}`)?.scrollIntoView({ behavior: "smooth" })}
              >
                <span>{totals.count} {totals.count === 1 ? "pozycja" : "pozycje"}</span>
                <b>Przejdź do zamówienia · {money(totals.totalCents)}</b>
              </button>
            ) : null}
          </>
        )}
      </section>

      {activeProduct ? (
        <div className={styles.modalBack} role="presentation" onMouseDown={closeProduct}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={`Konfiguracja: ${activeProduct.name}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>Dostosuj pozycję</p>
                <h2>{activeProduct.name}</h2>
                {activeProduct.description ? <p>{activeProduct.description}</p> : null}
              </div>
              <button type="button" className={styles.close} onClick={closeProduct} aria-label="Zamknij">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {activeProduct.optionGroups.map((group) => {
                const selectedCount = group.options.filter((option) =>
                  draftOptionIds.includes(option.id)
                ).length;
                const required = group.minSelected > 0;

                return (
                  <fieldset key={group.id} className={styles.optionGroup}>
                    <legend>
                      <span>{group.name}</span>
                      <small>
                        {required ? "Wymagane" : "Opcjonalne"}
                        {group.maxSelected > 0 ? ` · maks. ${group.maxSelected}` : ""}
                      </small>
                    </legend>

                    {group.helperText ? <p>{group.helperText}</p> : null}

                    <div className={styles.optionList}>
                      {group.options.map((option) => {
                        const selected = draftOptionIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={selected ? styles.optionSelected : ""}
                            onClick={() => toggleDraftOption(group, option.id)}
                          >
                            <span>
                              <b>{option.name}</b>
                              {option.priceCents ? <small>+{money(option.priceCents)}</small> : null}
                            </span>
                            <i aria-hidden="true">{selected ? "✓" : ""}</i>
                          </button>
                        );
                      })}
                    </div>

                    {selectedCount < group.minSelected ? (
                      <small className={styles.optionRequired}>Wybierz przynajmniej {group.minSelected}.</small>
                    ) : null}
                  </fieldset>
                );
              })}

              <label className={styles.instructions}>
                <span>Uwagi do tej pozycji</span>
                <textarea
                  value={draftInstructions}
                  onChange={(event) => setDraftInstructions(event.target.value)}
                  placeholder="Np. bez ostrego sosu"
                  rows={3}
                />
              </label>
            </div>

            <footer className={styles.modalFooter}>
              <div className={styles.draftQuantity}>
                <button
                  type="button"
                  onClick={() => setDraftQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Zmniejsz ilość"
                >
                  −
                </button>
                <strong>{draftQuantity}</strong>
                <button
                  type="button"
                  onClick={() => setDraftQuantity((value) => Math.min(10, value + 1))}
                  aria-label="Zwiększ ilość"
                >
                  +
                </button>
              </div>

              <div className={styles.modalSubmitWrap}>
                {draftError ? <p>{draftError}</p> : null}
                <button type="button" className={styles.modalSubmit} onClick={addToCart}>
                  Dodaj do zamówienia
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
