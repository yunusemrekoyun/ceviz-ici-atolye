import WindowControls from "#components/WindowControls.jsx";
import MacOSVideoPlayer from "#components/MacOSVideoPlayer.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import useWindowStore from "#store/window.js";

const VideoWindowContent = () => {
  const data = useWindowStore((state) => state.windows.videofile?.data);

  if (!data) return null;

  const name = data?.name ?? "Video";
  const videoUrl =
    data?.videoUrl || data?.href || data?.url || data?.src || data?.imageUrl;
  const posterUrl = data?.posterUrl || data?.poster;

  return (
    <>
      <div id="window-header">
        <WindowControls target="videofile" />
        <h2>{name}</h2>
      </div>

      <div className="videofile-body">
        {videoUrl ? (
          <MacOSVideoPlayer src={videoUrl} poster={posterUrl} title={name} />
        ) : (
          <p className="videofile-empty">Video preview is unavailable.</p>
        )}
      </div>
    </>
  );
};

const VideoWindow = WindowWrapper(VideoWindowContent, "videofile");

export default VideoWindow;
