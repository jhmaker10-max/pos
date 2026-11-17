function imprimirTicketCanvas(pedidoSeleccionado){

const pedido = pedidoSeleccionado || JSON.parse(localStorage.getItem("ultimoPedido") || "{}");
const tienda = localStorage.getItem("nombreTienda") || "TIENDA";
const logo = localStorage.getItem("logoTienda") || "";
const contacto = localStorage.getItem("contactoTienda") || "";
const mensajeTienda = localStorage.getItem("mensajeTicket") || "";

const ancho = 576;
let altura = 1150;

const mensaje = String(pedido.mensajePedido || "");
const maxCaracteres = 32;

function dividirTexto(texto){
    let resultado=[];
    const limpio=String(texto||"").replace(/\r/g,"");
    const bloques=limpio.split("\n");
    bloques.forEach(bloque=>{
        let linea="";
        bloque.split(/\s+/).forEach(p=>{
            if(!p) return;
            const prueba=linea ? linea+" "+p : p;
            if(prueba.length > maxCaracteres){
                if(linea.trim()) resultado.push(linea.trim());
                linea=p;
            }else{
                linea=prueba;
            }
        });
        if(linea.trim()) resultado.push(linea.trim());
    });
    return resultado;
}

const lineasMensaje = dividirTexto("MENSAJE: " + mensaje);
const varios = Array.isArray(pedido.items) && pedido.items.length > 0;
const metodoPago=pedido.metodoPago || document.querySelector('[name="metodoPagoPro"]:checked')?.value || '';
const qrPago=(metodoPago==='Yape'||metodoPago==='Plin')?(localStorage.getItem('qrPago'+metodoPago)||''):'';
const qrValido=/^(data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(qrPago);
altura += Math.max(0,lineasMensaje.length)*45 + 200 + (varios ? pedido.items.length*270 + 160 : 0) + (qrValido?420:0);

const canvas=document.createElement("canvas");
canvas.width=ancho;
canvas.height=altura;

const ctx=canvas.getContext("2d");
ctx.fillStyle="#fff";
ctx.fillRect(0,0,ancho,altura);

let y=60;

function texto(t,size=28,bold=false){
    ctx.textAlign="center";
    ctx.fillStyle="#000";
    ctx.font=(bold?"bold ":"")+size+"px Arial";
    ctx.fillText(String(t||""),288,y);
    y+=size+18;
}

function linea(){
    ctx.textAlign="center";
    ctx.font="28px monospace";
    ctx.fillText("--------------------------------",288,y);
    y+=35;
}

function dato(nombre,valor){
    ctx.textAlign="left";
    ctx.font="26px monospace";
    ctx.fillText(nombre+": "+String(valor||""),30,y);
    y+=45;
}

function datoLargo(nombre,valor){
    const texto=String(valor||"");
    const lineas=dividirTexto(texto);
    ctx.textAlign="left";
    ctx.font="26px monospace";
    ctx.fillText(nombre+":",30,y);
    y+=40;
    lineas.forEach(l=>{
        ctx.fillText(l,55,y);
        y+=40;
    });
}

async function generar(){

texto(tienda,34,true);
linea();
texto("BOLETA DE PEDIDO",28,true);
linea();

dato("N° PEDIDO",pedido.numero);
dato("CLIENTE",pedido.cliente);
if(pedido.dniCliente) dato("DNI",pedido.dniCliente);
if(pedido.telefonoCliente) dato("TELEFONO",pedido.telefonoCliente);
if(pedido.direccionCliente) datoLargo("DIRECCION",pedido.direccionCliente);
if(varios){
 pedido.items.forEach((item,i)=>{
  datoLargo(String(i+1)+". PRODUCTO",item.nombre);
  dato("COD.",item.codigo);
  dato("CANT. / UNIT.",String(item.cantidad)+" x S/ "+Number(item.precio||0).toFixed(2));
  dato("SUBTOTAL","S/ "+(Number(item.precio||0)*Number(item.cantidad||0)).toFixed(2));
 });
}else{
 dato("PRODUCTO",pedido.producto);
 dato("CODIGO",pedido.codigo);
 dato("PRECIO UNIT.","S/. "+pedido.precio);
 dato("CANTIDAD",pedido.cantidad || 1);
}
dato("TOTAL","S/. "+(pedido.total || pedido.subtotal || pedido.precio));
dato("FECHA PEDIDO",pedido.fechaPedido);
if(metodoPago){
 linea();texto("PAGO: "+metodoPago.toUpperCase(),27,true);
 if(qrValido){
  try{
   const imgQR=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=qrPago;});
   ctx.fillStyle='#fff';ctx.fillRect(138,y,300,300);
   ctx.drawImage(imgQR,138,y,300,300);y+=320;
   texto("ESCANEA PARA PAGAR",23,true);
  }catch(e){console.warn('No se pudo incluir el QR en la boleta compartida',e);}
 }
}
linea();

datoLargo("MENSAJE",pedido.mensajePedido);
dato("CONTACTO",contacto);

if(mensajeTienda) texto(mensajeTienda,24,false);

linea();
texto("GRACIAS POR SU COMPRA",28,true);
texto("VUELVA PRONTO",26,true);

// Recorta el lienzo al último contenido dibujado para quitar el espacio blanco
// sin cambiar el flujo de compartir que ya funcionaba en iPhone.
const altoFinal = Math.min(canvas.height, Math.ceil(y + 28));
const canvasRecortado = document.createElement("canvas");
canvasRecortado.width = ancho;
canvasRecortado.height = altoFinal;
const ctxRecortado = canvasRecortado.getContext("2d");
ctxRecortado.fillStyle = "#fff";
ctxRecortado.fillRect(0, 0, ancho, altoFinal);
ctxRecortado.drawImage(canvas, 0, 0, ancho, altoFinal, 0, 0, ancho, altoFinal);

canvasRecortado.toBlob(async blob=>{
 if(!blob) return;
 const archivo=new File([blob],"ticket-80mm.png",{type:"image/png"});
 try{
  if(navigator.share && navigator.canShare({files:[archivo]})){
    await navigator.share({files:[archivo]});
  }else{
    const a=document.createElement("a");
    a.href=canvasRecortado.toDataURL("image/png");
    a.download="ticket-80mm.png";
    a.click();
  }
 }catch(e){console.log(e);}
 finally{if(typeof window.mostrarDialogoFinVenta==='function')window.mostrarDialogoFinVenta();}
},"image/png",1);
}

if(logo){
 const img=new Image();
 img.onload=function(){
   ctx.drawImage(img,158,20,260,160);
   y=210;
   generar();
 };
 img.src=logo;
}else{
 generar();
}

}
