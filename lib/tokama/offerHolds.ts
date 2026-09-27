type SupabaseLike = any;

export async function getAvailableHouseIdsForOffer(input: {
  supabase: SupabaseLike;
  checkin: string;
  checkout: string;
  housesNeeded: number;
  excludeOfferId?: string;
}) {
  const { supabase, checkin, checkout, housesNeeded, excludeOfferId } = input;
  const [housesResult, reservationsResult, blocksResult, externalResult] = await Promise.all([
    supabase.from("tokama_houses").select("id,code,sort_order").order("sort_order", { ascending: true }),
    supabase.from("tokama_reservations").select("id").lt("checkin", checkout).gt("checkout", checkin).in("status", ["requested", "approved", "payment_sent", "paid", "confirmed"]),
    supabase.from("tokama_house_date_blocks").select("house_id,house_code").lt("start_date", checkout).gt("end_date", checkin),
    supabase.from("tokama_external_calendar_events").select("house_id").lt("start_date", checkout).gt("end_date", checkin),
  ]);
  const error = housesResult.error || reservationsResult.error || blocksResult.error || externalResult.error;
  if (error) throw error;

  const houses = housesResult.data || [];
  const reservationIds = (reservationsResult.data || []).map((item: { id: string }) => item.id);
  const assignmentsResult = reservationIds.length
    ? await supabase.from("tokama_reservation_houses").select("house_id").in("reservation_id", reservationIds)
    : { data: [], error: null };
  if (assignmentsResult.error) throw assignmentsResult.error;

  let holdsQuery = supabase
    .from("tokama_individual_offers")
    .select("id,held_house_ids")
    .in("status", ["sent", "accepted"])
    .gt("hold_expires_at", new Date().toISOString())
    .lt("checkin", checkout)
    .gt("checkout", checkin);
  if (excludeOfferId) holdsQuery = holdsQuery.neq("id", excludeOfferId);
  const holdsResult = await holdsQuery;
  if (holdsResult.error) throw holdsResult.error;

  const unavailable = new Set<string>();
  for (const item of assignmentsResult.data || []) if (item.house_id) unavailable.add(item.house_id);
  for (const item of externalResult.data || []) if (item.house_id) unavailable.add(item.house_id);
  for (const item of blocksResult.data || []) {
    if (item.house_id) unavailable.add(item.house_id);
    const matchingHouse = houses.find((house: { code?: string }) => String(house.code || "").toUpperCase() === String(item.house_code || "").toUpperCase());
    if (matchingHouse?.id) unavailable.add(matchingHouse.id);
  }
  for (const hold of holdsResult.data || []) {
    for (const houseId of Array.isArray(hold.held_house_ids) ? hold.held_house_ids : []) unavailable.add(houseId);
  }

  return houses.filter((house: { id: string }) => !unavailable.has(house.id)).slice(0, housesNeeded).map((house: { id: string }) => house.id);
}

export async function getActiveOfferHeldHouseIds(input: {
  supabase: SupabaseLike;
  checkin: string;
  checkout: string;
  excludeOfferId?: string;
}) {
  let query = input.supabase.from("tokama_individual_offers").select("id,held_house_ids")
    .in("status", ["sent", "accepted"])
    .gt("hold_expires_at", new Date().toISOString())
    .lt("checkin", input.checkout)
    .gt("checkout", input.checkin);
  if (input.excludeOfferId) query = query.neq("id", input.excludeOfferId);
  const { data, error } = await query;
  if (error) throw error;
  return new Set<string>((data || []).flatMap((offer: { held_house_ids?: string[] }) => Array.isArray(offer.held_house_ids) ? offer.held_house_ids : []));
}
