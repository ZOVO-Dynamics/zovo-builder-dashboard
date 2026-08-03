#!/bin/bash

cd ~/zovo-builder-dashboard || exit

echo "=== Installation adapter Prisma PostgreSQL ==="

npm install @prisma/adapter-pg pg

echo ""
echo "=== Création test DB Prisma compatible Prisma 7 ==="

cat > prisma-test-db.js <<'JS'
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main(){

 try {

   const users = await prisma.user.findMany({
     take:5,
     orderBy:{
       createdAt:"desc"
     }
   });

   console.log("Connexion PostgreSQL OK ✅");
   console.log(users);

 } catch(error){

   console.error("Erreur DB ❌");
   console.error(error.message);

 }

 finally{
   await prisma.$disconnect();
 }

}

main();
JS


echo ""
echo "=== TEST DATABASE ==="

node prisma-test-db.js

echo ""
echo "=== FIN ==="

