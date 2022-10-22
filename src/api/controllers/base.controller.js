/* eslint-disable max-len */
const APIError = require('../utils/APIError');
const httpStatus = require('http-status');
const { omit, clone, forEach, has, cloneDeep } = require('lodash');
const { modulesList } = require('../../config/constants');
const {transferModel} = require("../models/transaction.model")
var fieldsToOmit = "-__v -deleted"

module.exports = class BaseController {
  constructor(
    model,
    moduleId,
    moduleName = "Record",
    moduleNameToSetUserStats = null,
    ownerField = "created_by",
    duplicateField = null,
  ) {
    this.Model = model
    this.moduleId = moduleId
    this.OwnerField = ownerField
    this.ModuleName = moduleName
    this.DuplicateField = duplicateField
    this.ModuleNameToSetUserStats = moduleNameToSetUserStats
  }

  async Create(req, res, next) {
    try {
      let {body: params} = req
      delete params._id
      if (this.DuplicateField) {
        await this.findDuplicateForCreate(params, req.user)
      }
      params = this.mapDataForCreate(params, req.user)
      let resource = await this.Model.create(params)
      if (this.Model.modelName === "Business") {
        new transferModel({
          transaction_value: resource.current_value,
          to_user: req.user.id,
          business_id: resource.id,
          from_user: "6267c6f7ae5c9b31bccdc875",
        }).save()
      }
      if (resource) {
        resource = omit(resource.toJSON(), ["__v", "deleted"])
        return resource
      } else {
        throw new APIError({
          message: "Failed to create.",
          status: httpStatus.BAD_REQUEST,
        })
      }
    } catch (error) {
      return next(error)
    }
  }

  async findDuplicateForCreate(data, loggedInUser) {
    const duplicateQueryForCreate = {
      deleted: false,
      [this.OwnerField]: loggedInUser.id,
      [this.DuplicateField]: data[this.DuplicateField],
    }
    const duplicateResourceCount = await this.Model.countDocuments(
      duplicateQueryForCreate,
    ).exec()
    if (duplicateResourceCount) {
      throw new APIError({
        message: `${
          this.ModuleName
        } with same name already exist. Please provide different name for ${this.ModuleName.toLowerCase()}.`,
        status: httpStatus.BAD_REQUEST,
      })
    }
    return true
  }

  async List(
    req,
    res,
    next,
    queryObj,
    searchableFields,
    appendPublicField = false,
  ) {
    try {
      let {
        query,
        populate,
        fields,
        fieldsOmit,
        fieldsOmitString,
        sort,
        signedField,
        searchPopulate,
        populateSort,
      } = req.body
      let result = {}
      let countQuery = null
      if (!query) {
        query = {}
      }

      query = await this.getBaseQueryForFind(query, req.user, appendPublicField)

      delete query.fields
      if (!searchableFields) {
        searchableFields = []
      }
      if (query.search) {
        if (query.search.trim() && query.search.trim().length) {
          const searchVal = clone(query.search)
          if (!query["$or"]) {
            query["$or"] = []
            forEach(searchableFields, key => {
              const obj = {}
              obj[key] = {$regex: ".*" + searchVal + ".*", $options: "i"}
              query["$or"].push(obj)
            })
          } else {
            query[searchableFields[0]] = {
              $regex: ".*" + searchVal + ".*",
              $options: "i",
            }
          }
        }
        delete query.search
      } else if (typeof query.search === "string") {
        delete query.search
      }

      let projection = {
        __v: 0,
        deleted: 0,
      }
      if (fields && fields.length > 0) {
        projection = {}
        for (let index = 0; index < fields.length; index++) {
          projection[fields[index]] = 1
        }
      } else if (fieldsOmit && fieldsOmit.length > 0) {
        projection = {}
        for (let index = 0; index < fieldsOmit.length; index++) {
          projection[fieldsOmit[index]] = 0
        }
      }
      let findQuery = this.Model.find(query).lean().select(projection)
      if (queryObj && queryObj.page) {
        if (queryObj.page === 1) {
          countQuery = cloneDeep(query)
        }

        if (queryObj.perPage == null) {
          queryObj.perPage = 10
        }

        findQuery = findQuery
          .skip(queryObj.perPage * (queryObj.page - 1))
          .limit(queryObj.perPage)
      }

      if (sort) {
        findQuery = findQuery.collation({locale: "en"}).sort(sort)
      }

      if (populate && populate.length > 0) {
        var removeFields = "-__v -deleted"
        if (fieldsOmitString) {
          removeFields = fieldsOmitString
        }

        populate.forEach(populateVal => {
          const modelName = populateVal

          populateVal = {path: populateVal, select: removeFields}

          if (has(searchPopulate, modelName)) {
            populateVal.match = searchPopulate[modelName]
          }

          if (fields && fields.length > 0) {
            if (fields.indexOf(populateVal.path) > -1) {
              findQuery = findQuery.populate(populateVal)
            }
          } else {
            findQuery = findQuery.populate(populateVal)
          }
        })
      }

      if (queryObj && queryObj.page && queryObj.page === 1) {
        findQuery = findQuery
          .skip(queryObj.perPage * (queryObj.page - 1))
          .limit(queryObj.perPage)
        result.list = await findQuery
        result.totalCount = await this.Model.find(query)
          .countDocuments(countQuery)
          .exec()
      } else {
        result.list = await findQuery
        result.totalCount = await this.Model.find(query)
          .countDocuments(countQuery)
          .exec()
      }

      return result
    } catch (error) {
      throw next(error)
    }
  }

  async Get(req, res, next, fields = null, populate) {
    let {fieldsOmit} = req.body

    if (fieldsOmit) {
      fieldsToOmit = fieldsOmit
    }
    try {
      let query = {
        _id: req.params.id,
        deleted: false,
      }

      let findQuery = this.Model.findOne(query)
        .lean()
        .select(fields || fieldsToOmit)

      if (populate && populate.length > 0) {
        populate.forEach(populateVal => {
          populateVal = {path: populateVal, select: fieldsToOmit}
          findQuery = findQuery.populate(populateVal)
        })
      }
      const resource = await findQuery
      if (resource) {
        return resource
      } else {
        return null //new APIError({ message: 'Not found.', status: httpStatus.NOT_FOUND });
      }
    } catch (error) {
      return next(error)
    }
  }

  async getBaseQueryForFind(query, loggedInUser, appendPublicField = false) {
    query = {
      ...query,
    }
    if (!query.hasOwnProperty("deleted")) {
      query.deleted = false
    }

    return query
  }

  async findDuplicateForUpdate(id, data, loggedInUser) {
    const duplicateQueryForUpdate = {
      deleted: false,
      _id: {$ne: id},
      [this.OwnerField]: loggedInUser.id,
      [this.DuplicateField]: data[this.DuplicateField],
    }
    const duplicateResourceCount = await this.Model.countDocuments(
      duplicateQueryForUpdate,
    ).exec()
    if (duplicateResourceCount) {
      throw new APIError({
        message: `${
          this.ModuleName
        } with same name already exist. Please provide different name for ${this.ModuleName.toLowerCase()}.`,
        status: httpStatus.BAD_REQUEST,
      })
    }
    return true
  }

  mapDataForCreate(data, loggedInUser) {
    data = {
      ...data,
      deleted: false,
    }

    if (loggedInUser) {
      data[this.OwnerField] = loggedInUser.id
    }

    return data
  }

  async Update(_id, updateAttributes, req, res, next, respondToRequest = true) {
    try {
      let query = {
        _id,
      }

      // eslint-disable-next-line no-unused-vars
      updateAttributes && updateAttributes.id
        ? delete updateAttributes.id
        : null
      updateAttributes = omit(updateAttributes, ["__v", "deleted"])
      if (this.DuplicateField) {
        await this.findDuplicateForUpdate(_id, updateAttributes, req.user)
      }
      query = await this.getBaseQueryForFind(query, req.user)
      const resource = await this.Model.findOne(query).select(fieldsToOmit)
      if (resource) {
        Object.keys(updateAttributes).forEach(property => {
          resource[property] = updateAttributes[property]
        })
        let updatedResource = await resource.save()
        updatedResource = omit(updatedResource._doc, ["__v", "deleted"])
        // if (this.moduleId && modulesList.includes(this.moduleId)) {
        // 	ActivityService.saveOtherActivity(ActivityService.activityTypeNames.update, this.moduleId, updatedResource, req.user.id);
        // }
        return updatedResource
      } else {
        return null //new APIError({ message: 'Not found.', status: httpStatus.NOT_FOUND });
      }
    } catch (error) {
      return next(error)
    }
  }

  async Delete(req, res, next) {
    try {
      let query = {
        _id: req.params.id,
      }

      if (req.query[this.OwnerField]) {
        query[this.OwnerField] = req.query[this.OwnerField]
      }

      query = await this.getBaseQueryForFind(query, req.user)
      const resource = await this.Model.findOne(query)
      if (resource) {
        resource.deleted = true
        resource.deleted_by = req.user.id
        await resource.save()

        if (this.moduleId && modulesList.includes(this.moduleId)) {
          ActivityService.saveOtherActivity(
            ActivityService.activityTypeNames.delete,
            this.moduleId,
            resource,
            req.user.id,
            resource._doc[this.OwnerField],
          )
        }

        return resource
      } else {
        return null //throw new APIError({ message: 'Not found.', status: httpStatus.NOT_FOUND });
      }
    } catch (error) {
      return next(error)
    }
  }
}
