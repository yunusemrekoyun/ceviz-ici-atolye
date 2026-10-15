import WindowControls from "#components/WindowControls.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import useWindowStore from "#store/window.js";

const ImageWindowContent = () => {
  const data = useWindowStore((state) => state.windows.imgfile?.data);

  if (!data) return null;

  const { name, imageUrl } = data;

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile" />
        <h2>{name}</h2>
      </div>

      <div className="p-5 bg-white">
        {imageUrl ? (
          <div className="w-full">
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
        ) : null}
      </div>
    </>
  );
};

const ImageWindow = WindowWrapper(ImageWindowContent, "imgfile");

export default ImageWindow;
