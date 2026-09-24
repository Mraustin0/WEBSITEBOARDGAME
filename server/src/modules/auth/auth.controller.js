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
