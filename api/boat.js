const { Router } = require('express');
const {Datastore} = require('@google-cloud/datastore');
const dotenv = require('dotenv');

const datastore = new Datastore({ projectId: process.env.PROJECT_ID });
const router = new Router();
dotenv.config();

const BOAT = 'Boat';
const SLIP = 'Slip';

const boatEntity = (id, name, type, length, url) => {
  return {
    id,
    name,
    type,
    length,
    self: `${url}/boats/${id}`
  }
};

// Create a Boat
router.post('/', async (req, res, next) => {
  try {
    if (Object.keys(req.body).length < 3) {
      res.status(400).send({ Error: "The request object is missing at least one of the required attributes" });
    } else {
      const key = datastore.key(BOAT); // Create or get a kind from datastore
      const entity = {
        key: key,
        data: req.body
      };

      await datastore.save(entity); // Create a boat entity
      const boat = await datastore.get(key); // Get newly created boat entity

      res
        .status(201)
        .send(boatEntity(boat[0][datastore.KEY].id, boat[0].name, boat[0].type, boat[0].length, process.env.APP_URL));
    }
  } catch (error) {
    next(error);
  }
});

// Get a Boat
router.get('/:boat_id', async (req, res, next) => {
  try {
    const key = datastore.key([BOAT, parseInt(req.params.boat_id, 10)]);

    await datastore.get(key, (err, entity) => {
      // if not error and entity doesn't exist
      if (!err && !entity) {
        res.status(404).send({ Error: "No boat with this boat_id exists" });
      } else {
        res
          .status(200)
          .send(boatEntity(key.id, entity.name, entity.type, entity.length, process.env.APP_URL));
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get All Boats
router.get('/', async (req, res, next) => {
  try {
    const query = datastore.createQuery(BOAT);

    await datastore.runQuery(query, (err, entities) => {
      const response = [];

      entities.forEach(entity => {
        response.push(boatEntity(entity[datastore.KEY].id, entity.name, entity.type, entity.length, process.env.APP_URL));
      });

      res.status(200).send(response);
    });
  } catch (error) {
    next(error);
  }
});

// Edit a Boat
router.patch('/:boat_id', async (req, res, next) => {
  try {
    if (Object.keys(req.body).length < 3) {
      res.status(400).send({ Error: "The request object is missing at least one of the required attributes" });
    } else {
      const key = datastore.key([BOAT, parseInt(req.params.boat_id, 10)]);
      const entity = {
        key,
        data: req.body
      };

      await datastore.update(entity, async err => {
        if (err) {
          res.status(404).send({ Error: "No boat with this boat_id exists" });
        } else {
          const boat = await datastore.get(key);

          res
            .status(200)
            .send(boatEntity(boat[0][datastore.KEY].id, boat[0].name, boat[0].type, boat[0].length, process.env.APP_URL));
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// Delete a Boat
router.delete('/:boat_id', async (req, res, next) => {
  try {
    const key = datastore.key([BOAT, parseInt(req.params.boat_id, 10)]);

    await datastore.get(key, async (err, entity) => {
      if (!err && !entity) {
        res.status(404).send({ Error: "No boat with this boat_id exists" });
      } else {
        await datastore.delete(key); // Delete a boat

        // Delete a boat in the slip
        const query = datastore.createQuery(SLIP);
        await datastore.runQuery(query, (err, entities) => {
          entities.forEach(async entity => {
            if (entity.current_boat === req.params.boat_id) {
              const slipKey = datastore.key([SLIP, parseInt(entity[datastore.KEY].id)]);

              await datastore.update({
                key: slipKey,
                data: {
                  number: entity.number,
                  current_boat: null
                }
              });
            }
          })
        });

        res.status(204).end();
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router