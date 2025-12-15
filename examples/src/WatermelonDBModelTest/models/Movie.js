import { Model } from "@nozbe/watermelondb";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";

export default class Movie extends Model {
  static table = "movies";

  static associations = {
    reviews: { type: "has_many", foreignKey: "movie_id" }
  };

  @field("title") title;
  @field("poster_image") posterImage;
  @field("genre") genre;
  @field("description") description;

  @date("release_date_at") releaseDateAt;

  @children("reviews") reviews;

  getMovie() {
    return {
      title: this.title,
      posterImage: this.posterImage,
      genre: this.genre,
      description: this.description,
      releaseDateAt: this.releaseDateAt
    };
  }

  async addReview(body) {
    return this.collections.get("reviews").create(review => {
      review.movie.set(this);
      review.body = body;
    });
  }

  updateMovie = async updatedMovie => {
    await this.update(movie => {
      movie.title = updatedMovie.title;
      movie.genre = updatedMovie.genre;
      movie.posterImage = updatedMovie.posterImage;
      movie.description = updatedMovie.description;
      movie.releaseDateAt = updatedMovie.releaseDateAt;
    });
  };

  async deleteAllReview() {
    await this.reviews.destroyAllPermanently();
  }

  async deleteMovie() {
    await this.deleteAllReview(); // delete all reviews first
    await this.markAsDeleted(); // syncable
    await this.destroyPermanently(); // permanent
  }

  // 仅用于 Demo：通过 @writer 方法 + db.write/db.read 正确地验证 callWriter / callReader / subAction
  @writer async demoCallWriter() {
    // 在同一个 WorkQueue writer 上下文中，通过 callWriter 同步触发一个 db.write
    const nestedWriter = () => this.db.write(async () => this.title);
    // 注意：这里必须“同步”返回 callWriter 的 Promise，不能先 await 再返回
    return this.callWriter(() => nestedWriter());
  }

  @writer async demoCallReader() {
    // 在 writer 上下文中，通过 callReader 同步触发一个 db.read
    const nestedReader = () => this.db.read(async () => this.title);
    return this.callReader(() => nestedReader());
  }
}
