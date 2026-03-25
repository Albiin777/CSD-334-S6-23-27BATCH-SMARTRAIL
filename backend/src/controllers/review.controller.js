import { adminDb } from '../config/firebaseAdmin.js';

export async function getReviews(req, res) {
    try {
        const { trainNumber } = req.params;

        // Fetch reviews from Firestore
        const reviewsSnapshot = await adminDb.collection('reviews')
            .where('trainNumber', '==', trainNumber)
            .get();

        const data = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Calculate Averages for Overall and Categories
        let averageRating = 0;
        const categoryAverages = { cleanliness: 0, safety: 0, comfort: 0, schedule: 0, staff: 0 };
        
        if (data && data.length > 0) {
            const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
            averageRating = (sum / data.length).toFixed(1);

            // Per category averages
            Object.keys(categoryAverages).forEach(cat => {
                const catSum = data.reduce((acc, curr) => {
                    const r = curr.categoryRatings?.[cat] || curr.rating; // Fallback to overall rating for older reviews
                    return acc + r;
                }, 0);
                categoryAverages[cat] = Number((catSum / data.length).toFixed(1));
            });
        }

        res.json({ 
            success: true, 
            reviews: data, 
            averageRating: Number(averageRating),
            categoryAverages 
        });
    } catch (err) {
        console.error("Get reviews error:", err);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
}

export async function addReview(req, res) {
    try {
        const { trainNumber } = req.params;
        const { rating, comment, userId, userName, categoryRatings, images } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // We require a valid Supabase UUID for userId as per our schema
        if (!userId) {
            return res.status(400).json({ error: "User ID is required to post a review" });
        }

        const newReview = {
            trainNumber,
            userId,
            userName: userName || "Passenger",
            rating, // This is the overall average calculated on frontend
            categoryRatings: categoryRatings || { cleanliness: rating, safety: rating, comfort: rating, schedule: rating, staff: rating },
            comment,
            reviewImages: images || [],
            created_at: new Date().toISOString()
        };

        const docRef = await adminDb.collection('reviews').add(newReview);
        const savedReview = { id: docRef.id, ...newReview };

        res.status(201).json({ success: true, review: savedReview });
    } catch (err) {
        console.error("Add review error:", err);
        res.status(500).json({ error: "Failed to submit review" });
    }
}
