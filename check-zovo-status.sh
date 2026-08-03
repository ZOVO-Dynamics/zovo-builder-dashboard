#!/bin/bash

echo "======================================"
echo "   ZOVO BUILDER SYSTEM CHECK"
echo "======================================"

cd ~/zovo-builder-dashboard || exit

echo ""
echo "=== 1. ENV DATABASE ==="
if grep -q "DATABASE_URL" .env; then
    echo "DATABASE_URL trouvée ✅"
else
    echo "DATABASE_URL absente ❌"
fi

echo ""
echo "=== 2. PRISMA STATUS ==="
npx prisma --version

echo ""
echo "=== 3. DATABASE CONNECTION ==="
node <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function test(){
 try {
   const users = await prisma.user.findMany({
     take:5,
     orderBy:{createdAt:"desc"}
   });

   console.log("Connexion DB OK ✅");
   console.log("Utilisateurs trouvés:");
   console.log(users);

 } catch(e){
   console.log("Erreur DB ❌");
   console.log(e.message);
 }
 finally{
   await prisma.$disconnect();
 }
}

test();
NODE

echo ""
echo "=== 4. API REGISTER TEST ==="

curl -s -X POST http://localhost:3001/api/register \
-H "Content-Type: application/json" \
-d '{"name":"ZOVO Diagnostic","email":"diagnostic@zovo.ca","password":"Test123456"}'

echo ""

echo ""
echo "=== 5. AUTH FILES ==="

grep -R "strategy:.*jwt" src/lib/auth.ts 2>/dev/null && echo "JWT actif ✅"

grep -R "signIn" src/lib/auth.config.ts 2>/dev/null && echo "Auth config trouvée ✅"

echo ""
echo "======================================"
echo "   FIN DU TEST ZOVO"
echo "======================================"
