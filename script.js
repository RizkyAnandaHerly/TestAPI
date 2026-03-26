let allMeals = [];
let favorites = JSON.parse(localStorage.getItem("mealFavorites")) || [];
let showingFavorites = false;

// Fetch kategori untuk dropdown
fetch("https://www.themealdb.com/api/json/v1/1/categories.php")
  .then(res => res.json())
  .then(data => {
    const select = document.getElementById("category-select");
    data.categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.strCategory;
      option.textContent = cat.strCategory;
      select.appendChild(option);
    });

    select.value = "Seafood";
  });

// Fetch meal berdasarkan kategori
function fetchMeals(category = "Seafood") {
  const container = document.getElementById("meal-container");

  // Render 8 Skeleton card saat data sedang di-fetch
  container.innerHTML = Array(8).fill(`
    <div class="card skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
    </div>
  `).join('');

  fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
    .then(res => res.json())
    .then(data => {
      allMeals = data.meals || [];
      displayMeals(allMeals);
    });
}

// Tampilkan card
function displayMeals(meals) {
  const container = document.getElementById("meal-container");
  container.innerHTML = "";

  if (meals.length === 0) {
    container.innerHTML = "<p>No meals found.</p>";
    return;
  }

  meals.forEach((meal, index) => {
    const isFav = favorites.some(fav => fav.idMeal === meal.idMeal);

    const card = document.createElement("div");
    card.classList.add("card");
    card.style.animationDelay = `${index * 0.05}s`;
    card.onclick = () => openModal(meal.idMeal);

    card.innerHTML = `
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
          <h3>${meal.strMeal}</h3>
          <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${meal.idMeal}">${isFav ? '❤️' : '🤍'}</button>
      `;

    // Event listener 
    const favBtn = card.querySelector('.fav-btn');
    favBtn.onclick = (e) => toggleFavorite(e, meal.idMeal, meal.strMeal, meal.strMealThumb);

    container.appendChild(card);
  });
}

// ganti kategori
document.getElementById("category-select").addEventListener("change", function () {
  const selected = this.value || "Seafood";
  fetchMeals(selected);
});

// search
let searchTimeout;
document.getElementById("search-input").addEventListener("input", function () {
  const keyword = this.value.trim();

  // Batalkan timeout sebelumnya
  clearTimeout(searchTimeout);

  if (showingFavorites) {
    const filtered = favorites.filter(meal =>
      meal.strMeal.toLowerCase().includes(keyword.toLowerCase())
    );
    displayMeals(filtered);
    return;
  }

  if (keyword === "") {
    document.getElementById("category-select").value = "Seafood";
    fetchMeals("Seafood");
    return;
  }

  // Reset dropdown
  document.getElementById("category-select").value = "";

  searchTimeout = setTimeout(() => {
    const container = document.getElementById("meal-container");
    container.innerHTML = Array(8).fill(`
      <div class="card skeleton">
        <div class="skeleton-img"></div>
        <div class="skeleton-text"></div>
      </div>
    `).join('');

    fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${keyword}`)
      .then(res => res.json())
      .then(data => {
        allMeals = data.meals || [];
        displayMeals(allMeals);
      });
  }, 300);
});

// Load awal
fetchMeals("Seafood");

// Buka modal dengan data detail meal
function openModal(mealId) {
  fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.meals) return;
      const meal = data.meals[0];

      document.getElementById("modal-img").src = meal.strMealThumb;
      document.getElementById("modal-title").textContent = meal.strMeal;
      document.getElementById("modal-category").textContent =
        `${meal.strCategory} • ${meal.strArea}`;

      const instructions = meal.strInstructions || "";
      const cleaned = instructions
        .replace(/([0-9]+\.)([A-Z])/g, "$1 $2")
        .replace(/\r\n/g, "\n")
        .trim();
      document.getElementById("modal-instructions").textContent = cleaned;


      // Ambil bahan-bahan
      const ingredientsDiv = document.getElementById("modal-ingredients");
      ingredientsDiv.innerHTML = "";

      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== "") {
          const tag = document.createElement("span");
          tag.classList.add("ingredient-tag");
          tag.textContent = `${measure ? measure.trim() + " " : ""}${ingredient}`;
          ingredientsDiv.appendChild(tag);
        }
      }
      // YouTube embed
      const videoDiv = document.getElementById("modal-video");
      if (meal.strYoutube) {
        let videoId = "";
        try {
          const url = new URL(meal.strYoutube);
          videoId = url.searchParams.get("v");
        } catch (e) {
          videoId = meal.strYoutube.includes("v=") ? meal.strYoutube.split("v=")[1] : "";
        }

        if (videoId) {
          videoDiv.innerHTML = `
                <iframe
                src="https://www.youtube.com/embed/${videoId}"
                allowfullscreen
                id="yt-frame">
                </iframe>
                <p><a href="${meal.strYoutube}" target="_blank">▶ Watch on YouTube</a></p>
            `;
        } else {
          videoDiv.innerHTML = "";
        }
      } else {
        videoDiv.innerHTML = "";
      }
      // Sync tombol favorite
      const modalFavBtn = document.getElementById("modal-fav-btn");
      modalFavBtn.dataset.id = meal.idMeal;
      const isFav = favorites.some(fav => fav.idMeal === meal.idMeal);
      modalFavBtn.textContent = isFav ? '❤️' : '🤍';

      modalFavBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(
          { stopPropagation: () => { } },
          meal.idMeal,
          meal.strMeal,
          meal.strMealThumb
        );
      };

      document.getElementById("modal-overlay").classList.add("active");
    });
}

// Tutup modal
document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal-overlay").classList.remove("active");
  document.getElementById("modal-video").innerHTML = "";
});

document.getElementById("modal-overlay").addEventListener("click", function (e) {
  if (e.target === this) {
    this.classList.remove("active");
    document.getElementById("modal-video").innerHTML = "";
  }
});

// Surprise Me (random meal)
document.getElementById("surprise-btn").addEventListener("click", () => {
  const btn = document.getElementById("surprise-btn");
  btn.textContent = "🎲 Loading...";
  btn.disabled = true;

  fetch("https://www.themealdb.com/api/json/v1/1/random.php")
    .then(res => res.json())
    .then(data => {
      const meal = data.meals[0];
      btn.textContent = "🎲 Surprise Me!";
      btn.disabled = false;
      openModal(meal.idMeal);
    });
});

// Dark Mode
const themeBtn = document.getElementById("theme-btn");

// Cek preferensi tersimpan
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️ Light Mode";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Toggle Favorite
function toggleFavorite(event, idMeal, strMeal, strMealThumb) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }

  const existingIndex = favorites.findIndex(fav => fav.idMeal === idMeal);
  const isRemoving = existingIndex !== -1;

  if (isRemoving) {
    favorites.splice(existingIndex, 1);
    showToast(`💔 Dihapus dari Favorites!`);
  } else {
    favorites.push({ idMeal, strMeal, strMealThumb });
    showToast(`❤️ ${strMeal} ditambahkan ke Favorites!`);
  }

  localStorage.setItem("mealFavorites", JSON.stringify(favorites));

  // Sync state semua tombol card di list berdasarkan id
  const allBtns = document.querySelectorAll(`.fav-btn[data-id="${idMeal}"]`);
  allBtns.forEach(btn => {
    if (isRemoving) {
      btn.classList.remove("active");
      btn.textContent = '🤍';
    } else {
      btn.classList.add("active");
      btn.textContent = '❤️';
    }
  });

  // Sync state tombol modal jika sedang terbuka
  const modalFavBtn = document.getElementById("modal-fav-btn");
  if (modalFavBtn && modalFavBtn.dataset.id === idMeal) {
    modalFavBtn.textContent = isRemoving ? '🤍' : '❤️';
  }

  if (showingFavorites) {
    displayMeals(favorites);
  }
}

// Event untuk tombol My Favorites
document.getElementById("fav-filter-btn").addEventListener("click", function () {
  showingFavorites = !showingFavorites;
  this.classList.toggle("active-fav");

  if (showingFavorites) {
    displayMeals(favorites);
  } else {
    const selectedCategory = document.getElementById("category-select").value || "Seafood";
    fetchMeals(selectedCategory);
  }
});

// Toast Notifikasi
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.textContent = message;

  container.appendChild(toast);

  // Hapus dari DOM setelah animasi fade out
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.5s ease forwards";
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 2500);
}