import { Role, PERMISSION_CATALOG } from '../../models/role.model.js';
import { User } from '../../models/user.model.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { clearPermissionCache } from '../../lib/permissions.js';

/** role ที่มีอยู่จริง (ใช้ตอนกำหนด role ให้ผู้ใช้) */
export async function assertRoleExists(slug) {
  if (slug === 'user' || slug === 'admin') return;
  if (!(await Role.exists({ slug }))) throw badRequest(`unknown role: ${slug}`);
}

/** ห้ามทำให้ร้านไม่เหลือ admin ที่ใช้งานได้ */
export async function assertNotLastAdmin(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).map(String);
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
  if (admins.length && admins.every((a) => ids.includes(String(a._id)))) {
    throw badRequest('cannot remove the last active admin');
  }
}

const withCounts = async (roles) => {
  const rows = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
  const counts = new Map(rows.map((r) => [r._id, r.n]));
  return roles.map((r) => ({ ...r, memberCount: counts.get(r.slug) ?? 0 }));
};

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export async function list() {
  const items = await Role.find().sort({ isSystem: -1, name: 1 }).lean();
  return { items: await withCounts(items), catalog: PERMISSION_CATALOG };
}

export async function detail(id) {
  const role = await Role.findById(id).lean();
  if (!role) throw notFound('role not found');
  const members = await User.find({ role: role.slug })
    .select('_id username email displayName avatar status')
    .limit(100)
    .lean();
  return { ...role, memberCount: members.length, members };
}

export async function create(data, actor, req) {
  const slug = data.slug || slugify(data.name);
  const exists = await Role.findOne({ $or: [{ slug }, { name: data.name }] });
  if (exists) throw conflict('role name or slug already exists');
  const role = await Role.create({
    name: data.name,
    slug,
    description: data.description || '',
    permissions: data.permissions || [],
    isSystem: false,
    updatedBy: actor._id,
  });
  logAudit({
    req,
    actor,
    action: 'create',
    module: 'roles',
    summary: `สร้างบทบาท "${role.name}"`,
    targetType: 'Role',
    targetId: role._id,
  });
  return role;
}

export async function update(id, data, actor, req) {
  const role = await Role.findById(id);
  if (!role) throw notFound('role not found');
  if (role.isSystem && data.slug && data.slug !== role.slug) {
    throw badRequest('cannot change system role slug');
  }
  const oldSlug = role.slug;
  if (data.slug && data.slug !== oldSlug) {
    if (await Role.exists({ slug: data.slug })) throw conflict('slug already exists');
  }
  if (data.name) role.name = data.name;
  if (data.slug) role.slug = data.slug;
  if (data.description !== undefined) role.description = data.description;
  if (data.permissions) role.permissions = data.permissions;
  role.updatedBy = actor._id;
  await role.save();
  // เปลี่ยน slug → ย้ายสมาชิกตามไปด้วย ไม่ให้หลุดบทบาท
  if (role.slug !== oldSlug) await User.updateMany({ role: oldSlug }, { role: role.slug });
  clearPermissionCache();
  logAudit({
    req,
    actor,
    action: 'update',
    module: 'roles',
    summary: `แก้ไขบทบาท "${role.name}"`,
    targetType: 'Role',
    targetId: role._id,
  });
  return role;
}

export async function setPermissions(id, permissions, actor, req) {
  return update(id, { permissions }, actor, req);
}

export async function remove(id, actor, req) {
  const role = await Role.findById(id);
  if (!role) throw notFound('role not found');
  if (role.isSystem) throw badRequest('cannot delete system role');
  const inUse = await User.countDocuments({ role: role.slug });
  if (inUse > 0) throw conflict(`role is assigned to ${inUse} user(s)`);
  await role.deleteOne();
  clearPermissionCache();
  logAudit({
    req,
    actor,
    action: 'delete',
    module: 'roles',
    summary: `ลบบทบาท "${role.name}"`,
    targetType: 'Role',
    targetId: role._id,
  });
  return { ok: true };
}

export async function addMembers(id, userIds, actor, req) {
  const role = await Role.findById(id);
  if (!role) throw notFound('role not found');
  if (userIds.map(String).includes(String(actor._id))) {
    throw badRequest('cannot change your own role');
  }
  if (role.slug !== 'admin') await assertNotLastAdmin(userIds);
  await User.updateMany({ _id: { $in: userIds } }, { role: role.slug });
  logAudit({
    req,
    actor,
    action: 'role_change',
    module: 'roles',
    summary: `เพิ่ม ${userIds.length} คนเข้าบทบาท "${role.name}"`,
    targetType: 'Role',
    targetId: role._id,
    meta: { userIds },
  });
  return detail(id);
}

export async function removeMember(id, userId, actor, req) {
  const role = await Role.findById(id);
  if (!role) throw notFound('role not found');
  const user = await User.findById(userId);
  if (!user) throw notFound('user not found');
  if (user.role !== role.slug) throw badRequest('user is not in this role');
  if (String(user._id) === String(actor._id)) throw badRequest('cannot change your own role');
  if (role.slug === 'admin') await assertNotLastAdmin(user._id);
  user.role = 'user';
  await user.save();
  logAudit({
    req,
    actor,
    action: 'role_change',
    module: 'roles',
    summary: `ถอด ${user.username} ออกจากบทบาท "${role.name}"`,
    targetType: 'User',
    targetId: user._id,
  });
  return detail(id);
}

/** seed system roles ถ้ายังไม่มี */
export async function ensureSystemRoles() {
  const defaults = [
    {
      name: 'Super Admin',
      slug: 'admin',
      description: 'ผู้ดูแลระบบสูงสุด',
      isSystem: true,
      permissions: PERMISSION_CATALOG.map((p) => ({
        key: p.key,
        view: true,
        edit: true,
        del: true,
        approve: true,
      })),
    },
    {
      name: 'Member',
      slug: 'user',
      description: 'สมาชิกทั่วไป',
      isSystem: true,
      permissions: [],
    },
  ];
  for (const d of defaults) {
    await Role.findOneAndUpdate({ slug: d.slug }, d, { upsert: true, new: true });
  }
  // บทบาทตัวอย่างสำหรับพนักงาน — สร้างครั้งเดียว (แก้ไข/ลบได้ ไม่ทับของที่ admin แก้)
  const perm = (key, view, edit = false, del = false, approve = false) => ({
    key,
    view,
    edit,
    del,
    approve,
  });
  const starters = [
    {
      name: 'Store Manager',
      slug: 'manager',
      description: 'ผู้จัดการร้าน — ทุกอย่างยกเว้นจัดการสิทธิ์',
      permissions: PERMISSION_CATALOG.map((p) =>
        p.key === 'roles' ? perm(p.key, true) : perm(p.key, true, true, true, true),
      ),
    },
    {
      name: 'Game Master',
      slug: 'staff',
      description: 'พนักงานหน้าร้าน — ผังโต๊ะ เช็คบิล คลังเกม แจ้งซ่อม',
      permissions: [
        perm('floor', true, true),
        perm('checkout', true, true),
        perm('inventory', true),
        perm('maintenance', true, true),
      ],
    },
  ];
  for (const { slug, ...rest } of starters) {
    await Role.updateOne({ slug }, { $setOnInsert: rest }, { upsert: true });
  }
  clearPermissionCache();
}
