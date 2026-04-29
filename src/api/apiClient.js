import { supabase } from '@/lib/supabase';

// Devuelve el owner_id (el user_id del creador del hogar)
// Si el usuario no tiene hogar, devuelve su propio user_id
let cachedOwnerId = null;

const getOwnerId = async () => {
  if (cachedOwnerId) return cachedOwnerId;
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('household_links')
    .select('owner_id')
    .eq('user_id', user.id)
    .maybeSingle();
  cachedOwnerId = data?.owner_id || user.id;
  return cachedOwnerId;
};

const createEntity = (tableName) => ({
  list: async (orderBy) => {
    const ownerId = await getOwnerId();
    let query = supabase.from(tableName).select('*').eq('user_id', ownerId);
    if (orderBy) {
      const descending = orderBy.startsWith('-');
      const column = descending ? orderBy.slice(1) : orderBy;
      const mappedColumn = column === 'created_date' ? 'created_at' : column;
      query = query.order(mappedColumn, { ascending: !descending });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  filter: async (filters) => {
    const ownerId = await getOwnerId();
    let query = supabase.from(tableName).select('*').eq('user_id', ownerId);
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  create: async (payload) => {
    const ownerId = await getOwnerId();
    const { data, error } = await supabase
      .from(tableName)
      .insert({ ...payload, user_id: ownerId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, payload) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return id;
  },
});

export const api = {
  entities: {
    InventoryItem: createEntity('inventory_items'),
    Recipe: createEntity('recipes'),
    ShoppingList: createEntity('shopping_lists'),
    Task: createEntity('tasks'),
    CalendarEvent: createEntity('calendar_events'),
    Expense: createEntity('expenses'),
    Income: createEntity('income'),
    CustomCategory: createEntity('custom_categories'),
    AppSettings: createEntity('app_settings'),
    ChartConfig: createEntity('chart_configs'),
  },
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    logout: async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
  },
  users: {
    inviteUser: async (email) => {
      console.log('Invite not implemented yet for:', email);
    },
  },
};
