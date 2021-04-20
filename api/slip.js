const { Router } = require('express');
const {Datastore} = require('@google-cloud/datastore');
const dotenv = require('dotenv');

const datastore = new Datastore({ projectId: process.env.PROJECT_ID });
const router = new Router();
dotenv.config();

const SLIP = 'Slip';
const BOAT = 'Boat';

const slipEntity = (id, number, current_boat, url) => {
  return {
    id,
    number,
    current_boat,
    self: `${url}/slips/${id}`
  }
};

// Create a Slip
router.post('/', async (req, res, next) => {
  try {
    if (!req.body.number) {
      res.status(400).send({ Error: "The request object is missing the required number" });
    } else {
      const key = datastore.key(SLIP);
      const entity = {
        key,
        data: {
          number: req.body.number,
          current_boat: null
        }
      };

      await datastore.save(entity);
      const slip = await datastore.get(key);

      res
        .status(201)
        .send(slipEntity(slip[0][datastore.KEY].id, slip[0].number, slip[0].current_boat, process.env.APP_URL));
    }
  } catch (error) {
    next(error);
  }
});

// Get a Slip
router.get('/:slip_id', async (req, res, next) => {
  try {
    const key = datastore.key([SLIP, parseInt(req.params.slip_id, 10)]);

    await datastore.get(key, (err, entity) => {
      if (!err && !entity) {
        res.status(404).send({ Error: "No slip with this slip_id exists" });
      } else {
        res
          .status(200)
          .send(slipEntity(key.id, entity.number, entity.current_boat, process.env.APP_URL));
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get All Slips
router.get('/', async (req, res, next) => {
  try {
    const query = datastore.createQuery(SLIP);

    await datastore.runQuery(query, (err, entities) => {
      const response = [];

      entities.forEach(entity => {
        response.push(slipEntity(entity[datastore.KEY].id, entity.number, entity.current_boat, process.env.APP_URL));
      });

      res.status(200).send(response);
    });
  } catch (error) {
    next(error);
  }
});

// Delete a Slip
router.delete('/:slip_id', async (req, res, next) => {
  try {
    const key = datastore.key([SLIP, parseInt(req.params.slip_id, 10)]);

    await datastore.get(key, async (err, entity) => {
      if (!err && !entity) {
        res.status(404).send({ Error: "No slip with this slip_id exists" });
      } else {
        await datastore.delete(key);
        res.status(204).end()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Boat arrives at a Slip
router.put('/:slip_id/:boat_id', async (req, res, next) => {
  try {
    const slipKey = datastore.key([SLIP, parseInt(req.params.slip_id, 10)]);
    const boatKey = datastore.key([BOAT, parseInt(req.params.boat_id, 10)]);

    const slip = await datastore.get(slipKey);
    const boat = await datastore.get(boatKey);

    if (slip[0] === undefined || boat[0] === undefined) {
      res.status(404).send({ Error: "The specified boat and/or slip does not exist" });
    } else {
      if (slip[0].current_boat) {
        res.status(403).send({ Error: "The slip is not empty" });
      } else {
        const entity = {
          key: slipKey,
          data: {
            number: slip[0].number,
            current_boat: boat[0][datastore.KEY].id
          }
        };

        await datastore.update(entity);

        res.status(204).end();
      }
    }

  } catch (error) {
    next(error);
  }
});

// Boat departs a Slip
router.delete('/:slip_id/:boat_id', async (req, res, next) => {
  try {
    const slipKey = datastore.key([SLIP, parseInt(req.params.slip_id, 10)]);
    const boatKey = datastore.key([BOAT, parseInt(req.params.boat_id, 10)]);

    const slip = await datastore.get(slipKey);
    const boat = await datastore.get(boatKey);

    if (slip[0] === undefined || boat[0] === undefined) {
      res.status(404).send({ Error: "No boat with this boat_id is at the slip with this slip_id" });
    } else {
      if (slip[0].current_boat !== boat[0][datastore.KEY].id) {
        res.status(404).send({ Error: "No boat with this boat_id is at the slip with this slip_id" });
      } else {
        const entity = {
          key: slipKey,
          data: {
            number: slip[0].number,
            current_boat: null
          }
        };

        await datastore.update(entity);

        res.status(204).end();
      }
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router