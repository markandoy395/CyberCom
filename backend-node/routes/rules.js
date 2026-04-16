import express from 'express';
import RulesService from '../services/RulesService.js';
import { isAdmin } from './admin.js';
import { handleRouteError } from '../utils/httpErrors.js';

const router = new express.Router();

const validationErrorMessages = [
  'Invalid rule type',
  'Rules must be provided as an array.',
  'Each rule must be a string.',
  'Rule text cannot be empty.',
  'At least one rule is required.',
  'Legacy competition_rules schema detected.',
  'Rules tables not found.',
];

const getErrorStatus = message => (
  validationErrorMessages.some(item => message.startsWith(item)) ? 400 : 500
);

router.get('/rules/:type', async (req, res) => {
  try {
    const data = await RulesService.getRules(req.params.type);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleRouteError(res, error, { defaultStatus: getErrorStatus(error.message) });
  }
});

router.put('/admin/rules/:type', isAdmin, async (req, res) => {
  try {
    const data = await RulesService.replaceRules(req.params.type, req.body.rules);

    return res.json({
      success: true,
      data,
      message: `${data.type} rules saved successfully`,
    });
  } catch (error) {
    return handleRouteError(res, error, { defaultStatus: getErrorStatus(error.message) });
  }
});

router.post('/admin/rules/:type/reset', isAdmin, async (req, res) => {
  try {
    const data = await RulesService.resetRules(req.params.type);

    return res.json({
      success: true,
      data,
      message: `${data.type} rules reset successfully`,
    });
  } catch (error) {
    return handleRouteError(res, error, { defaultStatus: getErrorStatus(error.message) });
  }
});

export default router;
