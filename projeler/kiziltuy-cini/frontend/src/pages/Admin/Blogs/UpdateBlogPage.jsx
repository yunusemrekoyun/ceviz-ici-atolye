// src/pages/Admin/Blogs/UpdateBlogPage.jsx
import { Button, Form, Input, Spin, Upload, message, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import imageCompression from "browser-image-compression";

const UpdateBlogPage = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [removedIndexes, setRemovedIndexes] = useState([]);
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const { blogId } = useParams();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/api/blogs/${blogId}?withImages=true`
        );
        if (!res.ok) throw new Error("Blog bulunamadı");

        const blog = await res.json();
        const { title, content, images = [] } = blog;

        form.setFieldsValue({ title, content });

        setFileList(
          images.map((img, i) => ({
            uid: `${blog.blogId}-${i}`,
            name: `Görsel ${i + 1}`,
            status: "done",
            url: `${apiUrl}/api/blogs/${blog.blogId}/image/${i}`,
            thumbUrl: `${apiUrl}/api/blogs/${blog.blogId}/image/${i}`,
            type: img.contentType || "image/jpeg",
            index: i,
          }))
        );
      } catch (err) {
        console.error(err);
        message.error("Blog verisi alınamadı");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [apiUrl, blogId, form]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    const updatedList = newFileList.slice(-3);

    const removed = fileList.filter(
      (prevFile) => !updatedList.find((f) => f.uid === prevFile.uid)
    );

    removed.forEach((f) => {
      if (typeof f.index === "number") {
        setRemovedIndexes((prev) => [...prev, f.index]);
      }
    });

    setFileList(updatedList);
  };

  const onFinish = async (values) => {
    setLoading(true);

    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("content", values.content);

    if (removedIndexes.length > 0) {
      formData.append("toDeleteIndexes", JSON.stringify(removedIndexes));
    }

    for (const f of fileList) {
      if (f.originFileObj) {
        const compressed = await imageCompression(f.originFileObj, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        formData.append("images", compressed);
      }
    }

    const res = await fetch(`${apiUrl}/api/blogs/${blogId}`, {
      method: "PUT",
      body: formData,
    });

    if (res.ok) {
      message.success("Blog başarıyla güncellendi");
      navigate("/admin/blogs");
    } else {
      message.error("Blog güncellenemedi");
    }

    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <Form.Item
          label="Blog Başlığı"
          name="title"
          rules={[{ required: true, message: "Lütfen başlık girin" }]}
        >
          <Input placeholder="Blog başlığını girin" />
        </Form.Item>

        <Form.Item
          label="İçerik"
          name="content"
          valuePropName="value"
          getValueFromEvent={(content) => content}
          rules={[{ required: true, message: "Lütfen içerik girin" }]}
        >
          <ReactQuill theme="snow" style={{ background: "#fff" }} />
        </Form.Item>

        <Form.Item label="Kapak Görselleri">
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUploadChange}
            accept="image/*"
            multiple
          >
            {fileList.length < 3 && (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Yükle / Değiştir</div>
              </div>
            )}
          </Upload>
          <small>En fazla 3 görsel yükleyebilirsiniz.</small>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Güncelle
            </Button>
            <Button onClick={() => navigate(-1)}>İptal</Button>
          </Space>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default UpdateBlogPage;
