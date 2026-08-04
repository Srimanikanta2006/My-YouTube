import VideoCard from "./Videocard";
export default function ChannelVideos({ videos, title = "Videos" }: any) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No videos uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-lg font-bold mb-3 text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 w-full">
        {videos.map((video: any) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>
    </div>
  );
}
