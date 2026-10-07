import { Role, PERMISSION_CATALOG } from '../../models/role.model.js';
import { User } from '../../models/user.model.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';

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
  return { items, catalog: PERMISSION_CATALOG };
}

export async function detail(id) {
  const role = await Role.findById(id).lean();
  if (!role) throw notFound('role not found');
  const members = await User.find({ role: role.slug })
    .select('_id username email displayName avatar status')
    .limit(100)
    .lean();
  return { ...role, members };
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
  if (data.name) role.name = data.name;
  if (data.slug) role.slug = data.slug;
  if (data.description !== undefined) role.description = data.description;
  if (data.permissions) role.permissions = data.permissions;
  role.updatedBy = actor._id;
  await role.save();
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
  await User.updateMany({ _id: { $in: userIds } }, { role: role.slug });
  role.memberCount = await User.countDocuments({ role: role.slug });
  await role.save();
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
  user.role = 'user';
  await user.save();
  role.memberCount = await User.countDocuments({ role: role.slug });
  await role.save();
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
}
