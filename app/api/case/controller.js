// app/api/case/controller.js

const _ = require('lodash');

const { 
  accessCodeService,
  caseService,
  pointService,
  uploadService
} = require('../../../app/lib/db');

const transform = require('../../lib/pocTransform.js');

/**
 * @method fetchCasePoints
 *
 * Returns all points of concern for the provided case.
 *
 */
exports.fetchCasePoints = async (req, res) => {
  const { caseId } = req.body;

  if (!caseId) throw new Error('Case ID is not valid.');

  let concernPoints = await caseService.fetchCasePoints(caseId);
  
  if (concernPoints) {
    concernPoints = transform.discreetToDuration(concernPoints)
    res.status(200).json({ concernPoints });
  }
  else {
    throw new Error('Internal server error.');
  }
};

/**
 * @method fetchCasesPoints
 *
 * Returns all points of concern for the provided cases.
 *
 */
exports.fetchCasesPoints = async (req, res) => {
  const { caseIds } = req.body;

  if (!caseIds) {
    res.status(400).send();
    return;
  }

  let concernPoints = await caseService.fetchCasesPoints(caseIds);

  if (concernPoints) {
    concernPoints = transform.discreetToDuration(concernPoints)
    res.status(200).json({ concernPoints });
  }
  else {
    throw new Error('Internal server error.');
  }
};

/**
 * @method ingestUploadedPoints
 *
 * Attempts to associate previously uploaded points with a case.
 * Returns the points of concern that were uploaded for the case with the given access code.
 *
 */
exports.ingestUploadedPoints = async (req, res) => {
  const { caseId, accessCode: codeValue } = req.body;

  if (caseId == null || codeValue == null) {
    res.status(400).send();
    return;
  }

  const accessCode = await accessCodeService.find({ value: codeValue });

  // Check access code validity
  if (!accessCode) {
    res.status(403).send();
    return;
  }

  // Check whether user has declined upload acccess
  if (!accessCode.upload_consent) {
    res.status(451).send();
    return;
  }

  const uploadedPoints = await uploadService.fetchPoints(accessCode);

  // If the access code is valid but there aren't any points yet,
  // then the upload is still in progress
  if (!uploadedPoints || uploadedPoints.length == 0) {
    res.status(202).send();
    return;
  }

  const points = await pointService.createPointsFromUpload(caseId, uploadedPoints);

  await uploadService.deletePoints(accessCode);

  res.status(200).json({ concernPoints: points });
};

/**
 * @method deleteCasePoints
 *
 * Deletes the given points of concern.
 *
 */
exports.deleteCasePoints = async (req, res) => {
  const { pointIds } = req.body;

  if (pointIds ==  null || !_.isArray(pointIds)) {
    res.status(400).send();
    return;
  }

  if (pointIds.length > 0) {
    await pointService.deleteIds(pointIds);
  }

  res.status(200).send();
};

/**
 * @method createCasePoint
 *
 * Creates a new point of concern to be associated with the case.
 *
 */
exports.createCasePoint = async (req, res) => {
  const { caseId, point } = req.body;

  if (!caseId) throw new Error('Case ID is not valid.');
  if (!point.latitude) throw new Error('Latitude is not valid.');
  if (!point.longitude) throw new Error('Latitude is not valid.');
  if (!point.time) throw new Error('Latitude is not valid.');
  if (!point.duration) throw new Error('Duration is not valid.');

  let concernPoint = await caseService.createCasePoint(caseId, point);

  if (concernPoint) {
    [concernPoint] = transform.discreetToDuration([concernPoint])
    res.status(200).json({ concernPoint });
  }
  else {
    throw new Error('Internal server error.');
  }
};

/**
 * @method updateCasePoint
 *
 * Updates an existing point of concern
 *
 */
exports.updateCasePoint = async (req, res) => {
  const { body, body: { pointId } } = req;

  if (!pointId) throw new Error('Point ID is not valid.');
  if (!body.latitude) throw new Error('Latitude is not valid.');
  if (!body.longitude) throw new Error('Latitude is not valid.');
  if (!body.time) throw new Error('Latitude is not valid.');
  if (!body.duration) throw new Error('Duration is not valid.');

  const params = _.pick(body, ['longitude','latitude','time','duration']);

  let concernPoint = await pointService.updateRedactedPoint(pointId, params);

  if (concernPoint) {
    [concernPoint] = transform.discreetToDuration([concernPoint])
    res.status(200).json({ concernPoint });
  }
  else {
    throw new Error('Internal server error.');
  }
};

/**
 * @method deleteCasePoint
 *
 * Deletes the point of concern having the ID corresponding with the pointID param.
 *
 */
exports.deleteCasePoint = async (req, res) => {
  const { pointId } = req.body;

  if (!pointId) throw new Error('Case ID is not valid.')

  const caseResults = await pointService.deleteWhere({ id: pointId });

  if (caseResults) {
    res.sendStatus(200);
  }
  else {
    throw new Error('Internal server error.');
  }
};