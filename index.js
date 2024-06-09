const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middelware

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ieebpm5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // const menuCollection = client.db('RestaurantsDB').collection('menu');
    const cartCollection = client.db('MediMagicDB').collection('carts');
    const userCollection = client.db('MediMagicDB').collection('users');
    const advertiseCollection = client.db('MediMagicDB').collection('advertisement');
    const categoriesCollection = client.db('MediMagicDB').collection('categories');
    const cartAddCollection = client.db('MediMagicDB').collection('addCart');
    const paymentCollection = client.db('MediMagicDB').collection('payments');

    // JWT related API

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1hr'
      });
      res.send({ token })
    })

    // middle ware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        console.log('inside Token my ', req.headers.authorization);
        return res.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
      })

    }

    // verify token for admin verify token 

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Unauthorized access' })
      }
      next();
    }
    // all user read from database

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    // verify seller for role

    app.get('/users/seller/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let seller = false;
      if (user) {
        seller = user?.role === 'seller'
      }
      res.send({ seller })
    })

    // for Users insert into database

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email when user does not matching

      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user alreay exist', InsertedId: null })
      }
      const result = await userCollection.insertOne(user);

      res.send(result);
    })

    // user delete operation

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      const newRole = user.role === 'seller' ? 'user' : 'seller';
    
      const updatedDoc = {
        $set: {
          role: newRole
        }
      };
    
      const result = await userCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
      res.send(result);
    });


    // cart getting
    app.get('/carts', async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    })

    app.get('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    })

    // cart create

    app.post('/carts', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

      // categories getting
      app.get('/categories', async (req, res) => {
        const result = await categoriesCollection.find().toArray();
        res.send(result);
      })

    // insert categories 
    app.post('/categories', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await categoriesCollection.insertOne(item);
      res.send(result);
    })
  // categories delete
    app.delete('/categories/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await categoriesCollection.deleteOne(query);
      res.send(result)
    })

    // advertisement create

    app.post('/advertisement',  async (req, res) => {
      const item = req.body;
      const result = await advertiseCollection.insertOne(item);
      res.send(result);
    })
   // all advertisement get 
    app.get('/advertisement', async (req, res) => {
      const result = await advertiseCollection.find().toArray();
      res.send(result);
    })
  // specific email get all data 

    app.get('/advertisement/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await advertiseCollection.findOne(query);
      res.send(result);
    })
    app.patch('/advertisement/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const user = await advertiseCollection.findOne({ _id: new ObjectId(id) });
      const newStatus = user.status === 'advertise-pending' ? 'advertised' : 'advertise-pending';  // Change status to 'advertised' or 'advertise-pending'
  
      const updatedDoc = {
          $set: {
              status: newStatus 
          }
      };
  
      const result = await advertiseCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
      res.send(result);
  });
  



    // menu delteded

    // app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await menuCollection.deleteOne(query);
    //   res.send(result);

    // })

    // menu updated

    // app.patch('/menu/:id', async (req, res) => {
    //   const item = req.body;
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) }
    //   const updatedDoc = {
    //     $set: {
    //       name: item.name,
    //       category: item.category,
    //       price: item.price,
    //       recipe: item.recipe,
    //       image: item.image,
    //     }
    //   }
    //   const result = await menuCollection.updateOne(filter, updatedDoc);
    //   res.send(result);
    // })

  // for cart to read
    app.get('/addCart', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartAddCollection.find(query).toArray();
      res.send(result);
    })


    // For Cart data inserted
    app.post('/addCart', async (req, res) => {
      const cartItem = req.body;
      const result = await cartAddCollection.insertOne(cartItem);
      res.send(result);
    })

    // cart delete operation
    app.delete('/addCart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartAddCollection.deleteOne(query);
      res.send(result);

    })


    // here for payment 
    // payment content
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    app.get('/payments/:email', verifyToken, async(req,res)=>{
      const query = {email: req.params.email};
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access'});
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })
    //payment information create in Db

    app.post('/payment', async (req, res) =>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      // carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
         $in: payment.cartIds.map(id => new ObjectId (id))
      }
    }
      const deleteResult = await cartCollection.deleteMany(query)
      res.send({paymentResult, deleteResult})
    })

// admin modify status pending converted paid

    app.patch('/payments/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const status = await paymentCollection.findOne({ _id: new ObjectId(id) });
      const newStatus = status.status === 'paid' ? 'pending' : 'paid';
    
      const updatedDoc = {
        $set: {
          status: newStatus
        }
      };
    
      const result = await paymentCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    //todo
  }
   }
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Medicine Management is Running');

})

app.listen(port, () => {
  console.log(`Medicine Management is going on port ${port}`)
})
