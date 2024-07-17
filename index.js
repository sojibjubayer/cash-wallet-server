const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(express.json());
app.use(cookieParser());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j998cjx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("cash-wallet");
    const userCollection = database.collection("users");

    //Registration API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ phone: user.phone });
      if (existingUser) {
        return res.json({ error: "User with this  phone already exists" });
      }
      const result = await userCollection.insertOne(user);

      // Generate JWT token
      const token = jwt.sign(
        { userId: result.insertedId },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        maxAge: 3600000,
        sameSite: "strict",
      });
      res.send({ user });
    });

    //LOGIN API
    app.post("/login", async (req, res) => {
      const loginUser = req.body;

      const user = await userCollection.findOne({ phone: loginUser.phone });
      if (!user) {
        return res.send({ error: "User not found" });
      }

      // // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        maxAge: 3600000,
        sameSite: "strict",
      });

      res.send({ token, user });
    });

    //getUSER API
    app.get("/getUser", async (req, res) => {
      const { phone } = req.query; // Access phone from query parameters
      // Log phone number received from frontend

      // Example logic to fetch user details based on phone number
      try {
        // Replace with your logic to fetch user details from database or elsewhere
        const user = await userCollection.findOne({ phone });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json(user); // Send user details as JSON response
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // PATCH sendmoney targeted user
    // PATCH endpoint to update user by phone number
    app.patch("/users/:phone", async (req, res) => {
      const phone = req.params.phone;

      const updatedData = req.body;

      const filter = { phone: phone };
      const myFilter = { phone: updatedData.myPhone };

      const user = await userCollection.findOne({ phone });

      const myInfo = await userCollection.findOne({
        phone: updatedData.myPhone,
      });
      console.log(myInfo);

      const updatedBalance=updatedData.amount+user.balance;
      const myUpdatedBalance=myInfo.balance-updatedData.amount;

      const updateDoc = {
        $set: {
          balance: updatedBalance,
        },

      };
      const updateMyDoc = {
        $set: {
          balance: myUpdatedBalance,
        },

      };
      const result1 = await userCollection.updateOne(filter, updateDoc);
      const result2 = await userCollection.updateOne(myFilter, updateMyDoc);
      res.send(result1)
    });

    // Confirm successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("cash-wallet server is running");
});

app.listen(port, () => {
  console.log(`Cash-wallet server is running on port: ${port}`);
});
