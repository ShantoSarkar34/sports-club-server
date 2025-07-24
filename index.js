const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SECRET = `${process.env.DB_TOKEN}`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@sports-club.eejumeu.mongodb.net/?retryWrites=true&w=majority&appName=sports-club`;

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

    const database = client.db("sports-club");
    const courtsCollection = database.collection("courts");
    const usersCollection = database.collection("userdb"); 
    const adminCourtsCollection = database.collection("adminCourts");
    const announcementCollection = database.collection("announcement");
    const couponCollection = database.collection("coupons");

    // Get all courts
    app.get("/all-court", async (req, res) => {
      const cursor = courtsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get one court by ID
    app.get("/all-court/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courtsCollection.findOne(query);
      res.send(result);
    });

    // Get courts by userEmail query param
    app.get("/my-courts", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: "Email query is required" });
        }
        const result = await courtsCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // Admin login route
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });

      // Simple password check (plaintext) - change to bcrypt for production!
      if (password !== user.password) {
        return res.status(401).send({ message: "Wrong password" });
      }

      // Create JWT token
      const token = jwt.sign({ email: user.email, role: user.role }, SECRET, {
        expiresIn: "1h",
      });

      res.send({ token, role: user.role });
    });

    // Middleware to verify JWT token
    function verifyToken(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).send({ message: "No token" });

      const token = authHeader.split(" ")[1];
      jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: "Invalid token" });
        req.user = decoded;
        next();
      });
    }

    // Protected route for admin to get all courts
    app.get("/admin/all-courts", verifyToken, async (req, res) => {
      if (req.user.role !== "admin") {
        return res.status(403).send({ message: "Not authorized" });
      }
      const courts = await usersCollection.find().toArray();
      res.send(courts);
    });
    // get admin all courts 
    app.get("/admin/courts", async (req, res) => {
      const cursor = adminCourtsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get one court by ID
    app.get("/admin/courts/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await adminCourtsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Court not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error fetching court:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });
    // get announcement from announcementCollection

    app.get("/admin/announcement", async (req, res) => {
      const cursor = announcementCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get a single announcement from announcementCollection
    app.get("/admin/announcement/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await announcementCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "Court not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error fetching court:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });

    // update court form admin
    app.put("/admin/announcement/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = req.body;
      const updatedInfo = {
        $set: {
          title: update.title,
          des: update.des,
          date: update.date,
        },
      };
      const result = await announcementCollection.updateOne(
        filter,
        updatedInfo
      );
      res.send(result);
    });

    // delete announsment form admin
    app.delete("/admin/announcement/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await announcementCollection.deleteOne(query);
      res.send(result);
    });

    // create a new announsment form admin
    app.post("/admin/announcement", async (req, res) => {
      const newAnnouncement = req.body;
      const result = await announcementCollection.insertOne(newAnnouncement);
      newAnnouncement._id = result.insertedId;
      res.send(newAnnouncement);
    });

    // Create a new court from admin
    app.post("/admin/courts", async (req, res) => {
      const newCourt = req.body;
      const result = await adminCourtsCollection.insertOne(newCourt);
      newCourt._id = result.insertedId;
      res.send(newCourt);
    });

    // Create a new court
    app.post("/all-court", async (req, res) => {
      const newCourt = req.body;
      const result = await courtsCollection.insertOne(newCourt);
      res.send(result);
    });

    // create coupon form admin
    app.post("/admin/coupons", async (req, res) => {
      const newCourt = req.body;
      const result = await couponCollection.insertOne(newCourt);
      res.send(result);
    });

    // update court form admin
    app.put("/admin/courts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = req.body;
      const updatedInfo = {
        $set: {
          type: user.type,
          price: user.price,
          image: user.image,
          slots: user.slots,
        },
      };
      const result = await adminCourtsCollection.updateOne(filter, updatedInfo);
      res.send(result);
    });

    // delete court from admin
    app.delete("/admin/courts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await adminCourtsCollection.deleteOne(query);
      res.send(result);
    });

    // update approve form member & admin dashboard 

    app.put("/all-court/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = req.body;
      const updatedInfo = {
        $set: {
          status: user.status,
        },
      };
      const result = await courtsCollection.updateOne(filter, updatedInfo);
      res.send(result);
    });

    // Delete approve message from user dashboard
    app.delete("/all-court/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await courtsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Sports Club server is active now...!");
});

app.listen(port, () => {
  console.log(`Sports server is running on port ${port}`);
});
