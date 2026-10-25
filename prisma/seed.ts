/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
import { PrismaClient, Role, AttendanceStatus, AttendanceMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createQrCodeToken } from "../lib/qr-code";
const prisma=new PrismaClient();
async function main(){
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.length < 12) {
    throw new Error("ADMIN_INITIAL_PASSWORD deve ter pelo menos 12 caracteres.");
  }
  const passwordHash=await bcrypt.hash(initialPassword,12);
  const admin=await prisma.user.upsert({where:{email:"admin@catequesepresente.com"},update:{},create:{name:"Ana Administradora",email:"admin@catequesepresente.com",passwordHash,role:Role.ADMIN}});
  const coordinator=await prisma.user.upsert({where:{email:"coordenador@catequesepresente.com"},update:{},create:{name:"Paulo Coordenador",email:"coordenador@catequesepresente.com",passwordHash,role:Role.COORDINATOR}});
  const cat1=await prisma.user.upsert({where:{email:"maria@catequesepresente.com"},update:{},create:{name:"Maria Oliveira",email:"maria@catequesepresente.com",passwordHash,role:Role.CATECHIST,catechist:{create:{phone:"85999990001"}}},include:{catechist:true}});
  const cat2=await prisma.user.upsert({where:{email:"jose@catequesepresente.com"},update:{},create:{name:"José Santos",email:"jose@catequesepresente.com",passwordHash,role:Role.CATECHIST,catechist:{create:{phone:"85999990002"}}},include:{catechist:true}});
  const parishRecord=await prisma.parish.findFirst({where:{name:"Paróquia São João Batista",deletedAt:null},orderBy:{createdAt:"asc"},select:{id:true}});
  const parish=parishRecord
    ? await prisma.parish.update({where:{id:parishRecord.id},data:{city:"Osasco",address:"Praça Professor Anézio Cabral, 355, Osasco, São Paulo, 06226-010",priestName:"Pe. Leonardo Sousa"}})
    : await prisma.parish.create({data:{name:"Paróquia São João Batista",city:"Osasco",address:"Praça Professor Anézio Cabral, 355, Osasco, São Paulo, 06226-010",priestName:"Pe. Leonardo Sousa"}});
  const matriz=await prisma.community.upsert({where:{parishId_name:{parishId:parish.id,name:"Comunidade Matriz"}},update:{},create:{name:"Comunidade Matriz",parishId:parish.id}});
  const fatima=await prisma.community.upsert({where:{parishId_name:{parishId:parish.id,name:"Nossa Senhora de Fátima"}},update:{},create:{name:"Nossa Senhora de Fátima",parishId:parish.id}});
  const batismo=await prisma.sacrament.upsert({where:{name:"Batismo"},update:{},create:{name:"Batismo",description:"Iniciação à vida cristã"}});
  const eucaristia=await prisma.sacrament.upsert({where:{name:"Primeira Eucaristia"},update:{},create:{name:"Primeira Eucaristia",description:"Preparação para a mesa eucarística"}});
  const crisma=await prisma.sacrament.upsert({where:{name:"Crisma"},update:{},create:{name:"Crisma",description:"Confirmação da fé"}});
  const e1=await prisma.stage.upsert({where:{sacramentId_name:{sacramentId:eucaristia.id,name:"Eucaristia I"}},update:{},create:{sacramentId:eucaristia.id,name:"Eucaristia I",order:1}});
  const e2=await prisma.stage.upsert({where:{sacramentId_name:{sacramentId:eucaristia.id,name:"Eucaristia II"}},update:{},create:{sacramentId:eucaristia.id,name:"Eucaristia II",order:2}});
  const c1=await prisma.stage.upsert({where:{sacramentId_name:{sacramentId:crisma.id,name:"Crisma I"}},update:{},create:{sacramentId:crisma.id,name:"Crisma I",order:1}});
  const adultStage=await prisma.stage.upsert({where:{sacramentId_name:{sacramentId:batismo.id,name:"Adultos"}},update:{},create:{sacramentId:batismo.id,name:"Adultos",order:2}});
  await prisma.stage.upsert({where:{sacramentId_name:{sacramentId:batismo.id,name:"Preparação"}},update:{},create:{sacramentId:batismo.id,name:"Preparação",order:1}});
  const cls1=await prisma.class.upsert({where:{communityId_name_year:{communityId:matriz.id,name:"Eucaristia I — Sábado",year:2026}},update:{capacity:100},create:{name:"Eucaristia I — Sábado",year:2026,parishId:parish.id,communityId:matriz.id,sacramentId:eucaristia.id,stageId:e1.id,weekday:6,startTime:"09:00",location:"Sala São Lucas",startsAt:new Date("2026-02-07T12:00:00Z"),expectedEndAt:new Date("2026-12-05T12:00:00Z"),capacity:100,status:"ACTIVE",catechists:{create:{catechistId:cat1.catechist!.id,isPrimary:true}}}});
  const cls2=await prisma.class.upsert({where:{communityId_name_year:{communityId:fatima.id,name:"Crisma I — Domingo",year:2026}},update:{capacity:100},create:{name:"Crisma I — Domingo",year:2026,parishId:parish.id,communityId:fatima.id,sacramentId:crisma.id,stageId:c1.id,weekday:0,startTime:"16:00",location:"Salão pastoral",startsAt:new Date("2026-02-08T12:00:00Z"),expectedEndAt:new Date("2026-12-06T12:00:00Z"),capacity:100,status:"ACTIVE",catechists:{create:{catechistId:cat2.catechist!.id,isPrimary:true}}}});
  const clsAdult=await prisma.class.upsert({where:{communityId_name_year:{communityId:matriz.id,name:"Adultos — Domingo",year:2026}},update:{capacity:100},create:{name:"Adultos — Domingo",year:2026,parishId:parish.id,communityId:matriz.id,sacramentId:batismo.id,stageId:adultStage.id,weekday:0,startTime:"19:30",location:"Salão da Comunidade",startsAt:new Date("2026-02-08T12:00:00Z"),expectedEndAt:new Date("2026-12-06T12:00:00Z"),capacity:100,status:"ACTIVE",catechists:{create:{catechistId:cat1.catechist!.id,isPrimary:true}}}});
  const people=[
    {name:"Beatriz Lima",birth:"2016-04-12",classId:cls1.id,communityId:matriz.id,guardian:"Carla Lima",phone:"85988881001"},
    {name:"Gabriel Souza",birth:"2015-09-03",classId:cls1.id,communityId:matriz.id,guardian:"Roberto Souza",phone:"85988881002"},
    {name:"Helena Martins",birth:"2013-01-20",classId:cls2.id,communityId:fatima.id,guardian:"Luciana Martins",phone:"85988881003"},
    {name:"Miguel Costa",birth:"2012-11-08",classId:cls2.id,communityId:fatima.id,guardian:"Fernanda Costa",phone:"85988881004"}
  ];
  const adultPeople=[
    "Adilson Calixto de Oliveira",
    "Adriana Maria Prates Rocini",
    "Amanda Moreira Lima",
    "Ana Carolina de Jesus Pereira",
    "Arthur Faganelli Ferreira",
    "Beatriz Azurdo",
    "Beatriz Vieira dos Santos Nunes",
    "Bianca Ferreira Barboza da Silva de Souza",
    "Carla Cristina Gomes Bondezan",
    "Charlene da Silva Lisboa Sousa",
    "Cícera Patricia dos Santos Moura",
    "Cleiton Bastos de Santana",
    "Daiane da Conceição dos Santos",
    "Diego Gabriel Vitor",
    "Edilaine Duarte dos Santos",
    "Edna Alves Silva Pereira",
    "Elizangela da Silva Ribeiro",
    "Erilton de Moura Farias",
    "Evangelista",
    "Gean Carlos Leal Aguiar",
    "Gustavo Ferreira Tavares",
    "Gustavo Moura de Souza",
    "Irani Calixto de Oliveira",
    "Jean Caique Silva de Oliveira",
    "Jefferson de Brito",
    "Jemerson Jose de Brito",
    "Jennyfer Victória da Rocha Romão",
    "José Domingos da Silva Souza",
    "Larissa Oliveira da Silva",
    "Leudete Maria de Brito",
    "Lorrana de Jesus Filho",
    "Lucas Donha",
    "Lucilene Maria de Lima",
    "Luiz Otávio Diniz Florencio",
    "Maiara Valerio de Moraes Souza",
    "Maria Bonfim de Lima",
    "Maria Célia da Silva Brandão",
    "Micaele Moura de Souza",
    "Michelle de Melo Piccelli",
    "Neiva de Oliveira da Silva",
    "Nicolle Alves de Miranda",
    "Pamela Leal da Silva",
    "Rafael Nascimento da Silva",
    "Rebeca Amaro de Paula Cezar",
    "Richard Wilson Ferreira da Silva",
    "Rogério dos Reis Alves",
    "Rosangela Teodosio da Silva",
    "Sabrina Oliveira Simão",
    "Silvia do Amaral Alves",
    "Stefany Conceição de Souza",
    "Stella Ferreira de Oliveira",
    "Suellen Farias Martinez",
    "Suellen Ferreira dos Santos",
    "Taiane de Souza Santos",
    "Tainá da Silva Santos",
    "Thales Dionizio Silverio",
    "Vanessa Santos de Assis",
    "Vanessa Silva Barros",
    "Vanyres Évelin Pereira de Melo",
    "Victor Emiliano Ribeiro de Souza",
    "Victor Lourenço da Silva",
    "Victória Bezerra Nasareth",
    "Vinicius Evangelista da Silva",
    "Vitória da Silva Tomaz de Aquino"
  ];
  const youngPeople=[
    "Giovana M. Picelli",
    "Isabella Teoposio Michelin",
    "Antonio Wesley",
    "Kaique Augusto",
    "Nicole Cunha",
    "Gabriele Vigria da Silva Lima",
    "Felipe Alves",
    "Laura Miranda Saraiva da Silva",
    "Vitoria Marreiros de Barros",
    "Maria Luzia Dias Borges",
    "Isabella Alencar de Sousa",
    "Ana Clara Ferreira Rocha"
  ];
  const students=[];
  for(const p of people){const existing=await prisma.catechumen.findFirst({where:{fullName:p.name,birthDate:new Date(`${p.birth}T12:00:00Z`)}});const student=existing||await prisma.catechumen.create({data:{fullName:p.name,birthDate:new Date(`${p.birth}T12:00:00Z`),status:"ACTIVE",parishId:parish.id,communityId:p.communityId,city:"Fortaleza",joinedAt:new Date("2026-02-01T12:00:00Z"),qrCode:{create:createQrCodeToken()}}});const guardian=await prisma.guardian.upsert({where:{cpf:`SEED-${p.phone}`},update:{},create:{fullName:p.guardian,cpf:`SEED-${p.phone}`,phone:p.phone,whatsapp:p.phone,allowMessages:true}});await prisma.catechumenGuardian.upsert({where:{catechumenId_guardianId:{catechumenId:student.id,guardianId:guardian.id}},update:{},create:{catechumenId:student.id,guardianId:guardian.id,relationship:"Responsável",isPrimary:true,isEmergency:true}});await prisma.enrollment.upsert({where:{catechumenId_classId:{catechumenId:student.id,classId:p.classId}},update:{status:"ACTIVE"},create:{catechumenId:student.id,classId:p.classId}});students.push(student)}
  for(const name of adultPeople){
    const existing=await prisma.catechumen.findFirst({where:{fullName:{equals:name,mode:"insensitive"},deletedAt:null}});
    const student=existing || await prisma.catechumen.create({data:{fullName:name,status:"ACTIVE",parishId:parish.id,communityId:matriz.id,city:"Osasco",joinedAt:new Date("2026-02-01T12:00:00Z"),qrCode:{create:createQrCodeToken()}}});
    await prisma.enrollment.upsert({where:{catechumenId_classId:{catechumenId:student.id,classId:clsAdult.id}},update:{status:"ACTIVE"},create:{catechumenId:student.id,classId:clsAdult.id}});
  }
  for(const name of youngPeople){
    await prisma.$transaction(async tx=>{
      const existing=await tx.catechumen.findFirst({where:{fullName:{equals:name,mode:"insensitive"},deletedAt:null},include:{qrCode:true}});
      const student=existing || await tx.catechumen.create({data:{fullName:name,status:"ACTIVE",parishId:parish.id,communityId:fatima.id,city:"Osasco",joinedAt:new Date("2026-02-01T12:00:00Z"),qrCode:{create:createQrCodeToken()}}});
      if(existing){
        await tx.catechumen.update({where:{id:student.id},data:{status:"ACTIVE"}});
        if(!existing.qrCode || !existing.qrCode.active || existing.qrCode.expiresAt<=new Date()){
          const qrCode=createQrCodeToken();
          await tx.qRCodeToken.upsert({where:{catechumenId:student.id},create:{catechumenId:student.id,...qrCode},update:{...qrCode,active:true}});
        }
      }
      await tx.enrollment.updateMany({where:{catechumenId:student.id,status:"ACTIVE",classId:{not:cls2.id}},data:{status:"TRANSFERRED",endedAt:new Date()}});
      await tx.enrollment.upsert({where:{catechumenId_classId:{catechumenId:student.id,classId:cls2.id}},update:{status:"ACTIVE",endedAt:null,deletedAt:null},create:{catechumenId:student.id,classId:cls2.id}});
    });
  }
  const meeting=await prisma.meeting.findFirst({where:{classId:cls1.id,theme:"Jesus nos reúne"}})||await prisma.meeting.create({data:{classId:cls1.id,date:new Date("2026-07-18T12:00:00Z"),startTime:"09:00",endTime:"10:30",theme:"Jesus nos reúne",content:"A comunidade como família de fé",responsibleId:cat1.id,status:"CLOSED"}});
  await prisma.meeting.findFirst({where:{classId:cls1.id,theme:"A Palavra de Deus"}})||await prisma.meeting.create({data:{classId:cls1.id,date:new Date("2026-07-25T12:00:00Z"),startTime:"09:00",endTime:"10:30",theme:"A Palavra de Deus",responsibleId:cat1.id,status:"SCHEDULED"}});
  for(let i=0;i<2;i++)await prisma.attendance.upsert({where:{catechumenId_meetingId:{catechumenId:students[i].id,meetingId:meeting.id}},update:{},create:{catechumenId:students[i].id,classId:cls1.id,meetingId:meeting.id,status:i===0?AttendanceStatus.PRESENT:AttendanceStatus.JUSTIFIED,method:AttendanceMethod.MANUAL,recordedById:coordinator.id}});
  await prisma.announcement.findFirst({where:{title:"Missa das famílias"}})||await prisma.announcement.create({data:{title:"Missa das famílias",message:"Convidamos todas as famílias para a celebração deste domingo às 18h.",recipientType:"ALL",channel:"WHATSAPP",priority:"NORMAL",status:"PENDING"}});
  await prisma.auditLog.create({data:{userId:admin.id,action:"SEED",entity:"System",after:{message:"Dados iniciais instalados"}}});
  console.log("Seed concluído. A senha inicial foi lida de ADMIN_INITIAL_PASSWORD.");
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
