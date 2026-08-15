import { supabase } from "./supabase";

// A lightweight anonymous device id, used only to scope each visitor's
// private dream history. No account or login involved.
export function getDeviceId() {
  let id = localStorage.getItem("nocturne_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("nocturne_device_id", id);
  }
  return id;
}

// ---------- Dream Wall (public, shared) ----------
export async function loadWallPosts(limit = 50) {
  const { data, error } = await supabase
    .from("dream_wall_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function postDreamToWall({ dreamText, essence }) {
  const { data, error } = await supabase
    .from("dream_wall_posts")
    .insert({ dream_text: dreamText, essence, comments: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addCommentToPost(post, commentText) {
  const updatedComments = [...(post.comments || []), { text: commentText, created_at: new Date().toISOString() }];
  const { data, error } = await supabase
    .from("dream_wall_posts")
    .update({ comments: updatedComments })
    .eq("id", post.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- Personal dream history (private per device) ----------
export async function loadHistory(limit = 50) {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("dream_history")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function saveHistoryEntry({ dreamText, result, lenses }) {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("dream_history")
    .insert({ device_id: deviceId, dream_text: dreamText, result, lenses })
    .select()
    .single();
  if (error) throw error;
  return data;
}
