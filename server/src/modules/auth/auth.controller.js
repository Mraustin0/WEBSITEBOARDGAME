import * as service from './auth.service.js';

export const register = async (req, res) => {
  const result = await service.register(req.body);
  res.status(201).json(result);
};

export const login = async (req, res) => {
  const result = await service.login(req.body);
  res.json(result);
};

export const me = (req, res) => {
  res.json(req.user.toPublic ? req.user.toPublic() : req.user);
};

export const changePassword = async (req, res) => {
  await service.changePassword(req.user._id, req.body);
  res.json({ ok: true });
};

// stateless JWT — client just discards the token; endpoint exists so client can call it uniformly
export const logout = (_req, res) => res.status(204).end();
