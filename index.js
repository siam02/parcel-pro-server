const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fgzyiou.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {

    try {

        const userCollection = client.db("parcelProDB").collection("users");
        const parcelCollection = client.db("parcelProDB").collection("parcels");


        //JWT API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })



        // Middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.type === 'Admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }





        // User Related API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.put('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const options = { upsert: true };
            const updateUser = req.body;

            const user = {
                $set: {
                    photo: updateUser.photo,
                    name: updateUser.name,
                    phoneNumber: updateUser.phoneNumber
                }
            }

            const result = await userCollection.updateOne(filter, user, options);
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.type === 'Admin';
            }
            res.send({ admin });
        });


        app.get('/users/delivery-man/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let deliveryMan = false;
            if (user) {
                deliveryMan = user?.type === 'DeliveryMen';
            }
            res.send({ deliveryMan: deliveryMan });
        });


        app.get('/users/delivery-men', async (req, res) => {


            const query = { type: "DeliveryMen" };
            const deliveryMen = await userCollection.find(query).toArray();

            res.send(deliveryMen);
        });


        app.get('/users/type/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let type = "User";
            if (user) {
                type = user?.type;
            }
            res.send({ type: type });
        });


        app.get('/user-by-email/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            res.send(user);
        });

        app.get('/user-by-id/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query);
            res.send(result);
        });




        // Parcel Reclated API
        app.get('/parcels', verifyToken, verifyAdmin, async (req, res) => {

            const { startDate, endDate } = req.query;
            const query = {};

            if (startDate && endDate) {
                query.reqDeliveryDate = {
                  $gte: startDate,
                  $lte: endDate
                };
              }

            const cursor = parcelCollection.find(query);
            
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/parcels', verifyToken, async (req, res) => {
            const parcel = req.body;
            const result = await parcelCollection.insertOne(parcel);
            res.send(result);
        });

        app.get('/parcels-by-email/:email', verifyToken, async (req, res) => {

            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const cursor = parcelCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);

        });

        app.patch('/parcels/cancel/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'cancelled'
                }
            }
            const result = await parcelCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/parcels/update-admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateParcel = req.body;
            const parcel = {
                $set: {
                    deliveryManID: updateParcel.deliveryManID,
                    approxDeliveryDate: updateParcel.approxDeliveryDate,
                    status: "On The Way"
                }
            }
            const result = await parcelCollection.updateOne(filter, parcel, options);
            res.send(result);
        })

        app.get('/parcels-by-id/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await parcelCollection.findOne(query);
            res.send(result);
        })

        app.put('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateParcel = req.body;

            const parcel = {
                $set: {
                    phoneNumber: updateParcel.phoneNumber,
                    parcelType: updateParcel.parcelType,
                    parcelWeight: updateParcel.parcelWeight,
                    receiverName: updateParcel.receiverName,
                    receiverPhone: updateParcel.receiverPhone,
                    deliveryAddress: updateParcel.deliveryAddress,
                    reqDeliveryDate: updateParcel.reqDeliveryDate,
                    latitude: updateParcel.latitude,
                    longitude: updateParcel.longitude,
                    price: updateParcel.price,
                }
            }

            const result = await parcelCollection.updateOne(filter, parcel, options);
            res.send(result);
        })


        //Statistics
        app.get('/statistics', verifyToken, verifyAdmin, async (req, res) => {
            const bookings = await parcelCollection.aggregate([
                {
                    $group: {
                        _id: "$bookingDate",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]).toArray();

            const delivered = await parcelCollection.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: "$bookingDate",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]).toArray();

            const dates = bookings.map(b => b._id);
            const bookingsData = bookings.map(b => b.count);
            const deliveredData = delivered.map(d => d.count);

            res.json({ bookings: bookingsData, delivered: deliveredData, dates });
        })


    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Parvel Pro server is running')
})

app.listen(port, () => {
    console.log(`Parvel Pro Server is running on port: ${port}`)
})