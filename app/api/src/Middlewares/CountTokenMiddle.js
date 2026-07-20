import {
  releaseTokenQuota,
  reserveTokenQuota,
  settleTokenQuota,
} from "../Services/TokenQuotaService.js";

const countTokenMiddle = (req, _res, next) => {
  req.tokenQuota = {
    release: releaseTokenQuota,
    reserve: (details) =>
      reserveTokenQuota({ ...details, userId: req.user.id }),
    settle: settleTokenQuota,
  };
  next();
};

export default countTokenMiddle;
