const products = [
  {id:1,name:"Aashirvaad Atta 5kg",sku:"AT-5001",category:"Grocery",price:295,stock:8,tag:"AA",className:"orange"},
  {id:2,name:"Tata Salt 1kg",sku:"TS-1001",category:"Grocery",price:31,stock:45,tag:"TS",className:"blue"},
  {id:3,name:"Amul Milk 1L",sku:"ML-1002",category:"Beverages",price:68,stock:5,tag:"AM",className:"blue"},
  {id:4,name:"Coca-Cola 750ml",sku:"CC-7503",category:"Beverages",price:48,stock:23,tag:"CC",className:"red"},
  {id:5,name:"Lays Magic Masala",sku:"LY-1102",category:"Snacks",price:20,stock:61,tag:"LY",className:"yellow"},
  {id:6,name:"Good Day Cookies",sku:"GD-1801",category:"Snacks",price:35,stock:32,tag:"GD",className:"orange"},
  {id:7,name:"Surf Excel 1kg",sku:"SX-1820",category:"Grocery",price:145,stock:6,tag:"SX",className:"green"},
  {id:8,name:"Bournvita 500g",sku:"BV-4010",category:"Beverages",price:229,stock:9,tag:"BV",className:"purple"},
  {id:9,name:"Colgate MaxFresh",sku:"CG-2201",category:"Personal Care",price:112,stock:28,tag:"CG",className:"red"},
  {id:10,name:"Dove Soap 100g",sku:"DV-1090",category:"Personal Care",price:58,stock:36,tag:"DV",className:"blue"},
  {id:11,name:"Thums Up 750ml",sku:"TU-7501",category:"Beverages",price:48,stock:19,tag:"TU",className:"red"},
  {id:12,name:"Parle-G Biscuits",sku:"PG-1902",category:"Snacks",price:10,stock:88,tag:"PG",className:"orange"}
];

const cart = new Map();
let activeCategory = "All";
let payment = "Cash";
let discount = 0;

const productGrid = document.getElementById("productGrid");
const cartItems = document.getElementById("cartItems");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");

function money(value){ return "₹" + value.toLocaleString("en-IN"); }

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>toast.classList.remove("show"),2200);
}

function renderProducts(){
  const q = searchInput.value.trim().toLowerCase();
  const visible = products.filter(p =>
    (activeCategory === "All" || p.category === activeCategory) &&
    (!q || [p.name,p.sku,p.category].some(v=>v.toLowerCase().includes(q)))
  );

  productGrid.innerHTML = visible.length ? visible.map(p => `
    <article class="product">
      <div class="product-image ${p.className}">${p.tag}</div>
      <div class="product-name" title="${p.name}">${p.name}</div>
      <div class="product-meta">${p.sku} • ${p.category}</div>
      <div class="product-bottom">
        <div><div class="product-price">${money(p.price)}</div><div class="product-stock">${p.stock} in stock</div></div>
        <button class="add-btn" data-add="${p.id}" aria-label="Add ${p.name}">+</button>
      </div>
    </article>`
  ).join("") : '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#8b91a0;font-size:12px">No products found.</div>';

  productGrid.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click",()=>addToCart(Number(btn.dataset.add)));
  });
}

function addToCart(id){
  const item = products.find(p=>p.id===id);
  if(!item) return;
  const current = cart.get(id) || 0;
  if(current >= item.stock){ showToast("Stock limit reached for this item."); return; }
  cart.set(id,current+1);
  renderCart();
  showToast(item.name + " added");
}

function updateQty(id,delta){
  const next = (cart.get(id)||0) + delta;
  const item = products.find(p=>p.id===id);
  if(next <= 0) cart.delete(id);
  else if(next > item.stock) showToast("Not enough stock available.");
  else cart.set(id,next);
  renderCart();
}

function renderCart(){
  const empty = document.getElementById("emptyState");
  const entries = [...cart.entries()];
  let subtotal = 0;
  let count = 0;

  if(!entries.length){
    cartItems.innerHTML = '<div class="empty-state" id="emptyState"><div class="empty-icon">🛒</div><strong>Your cart is empty</strong><span>Add products from the left to start a sale.</span></div>';
  } else {
    cartItems.innerHTML = entries.map(([id,qty])=>{
      const p = products.find(x=>x.id===id);
      subtotal += p.price * qty;
      count += qty;
      return `
        <div class="cart-line">
          <div class="line-thumb ${p.className}">${p.tag}</div>
          <div class="line-copy">
            <strong>${p.name}</strong>
            <span>${money(p.price)} each</span>
            <div class="qty"><button data-dec="${id}">−</button><span>${qty}</span><button data-inc="${id}">+</button></div>
          </div>
          <div class="line-price">
            <strong>${money(p.price*qty)}</strong>
            <button class="remove" data-remove="${id}" title="Remove">×</button>
          </div>
        </div>`;
    }).join("");

    cartItems.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>updateQty(Number(b.dataset.dec),-1));
    cartItems.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>updateQty(Number(b.dataset.inc),1));
    cartItems.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart.delete(Number(b.dataset.remove));renderCart();});
  }

  const gst = Math.round(Math.max(subtotal-discount,0) * 0.05);
  const total = Math.max(subtotal-discount,0) + gst;
  document.getElementById("itemCountLabel").textContent = count + (count===1 ? " item" : " items");
  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("gst").textContent = money(gst);
  document.getElementById("total").textContent = money(total);
}

document.querySelectorAll(".category").forEach(btn=>{
  btn.addEventListener("click",()=>{
    activeCategory = btn.dataset.category;
    document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b===btn));
    renderProducts();
  });
});

document.querySelectorAll(".payment").forEach(btn=>{
  btn.addEventListener("click",()=>{
    payment = btn.dataset.payment;
    document.querySelectorAll(".payment").forEach(b=>b.classList.toggle("active",b===btn));
  });
});

searchInput.addEventListener("input",renderProducts);
document.getElementById("clearCart").addEventListener("click",()=>{cart.clear();discount=0;renderCart();showToast("Cart cleared");});
document.getElementById("discountBtn").addEventListener("click",()=>{
  if(!cart.size){showToast("Add a product before applying a discount.");return;}
  const value = Number(prompt("Enter discount amount in ₹", discount || "50"));
  if(Number.isFinite(value) && value >= 0){discount=value;renderCart();showToast("Discount applied");}
});
document.getElementById("checkoutBtn").addEventListener("click",()=>{
  if(!cart.size){showToast("Add products to create a bill.");return;}
  const total = document.getElementById("total").textContent;
  showToast("Payment of " + total + " via " + payment + " completed");
  cart.clear();discount=0;renderCart();
});
document.getElementById("newSaleBtn").addEventListener("click",()=>document.getElementById("searchInput").focus());
document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){e.preventDefault();searchInput.focus();}
});
renderProducts();
renderCart();
